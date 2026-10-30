-- M1: disponibilidade, marcar e cancelar. Escrita sensível só por aqui.

-- Slots de 60 min a contar do início de cada período, menos folgas,
-- dentro da antecedência mínima/máxima. Hora local de Lisboa.
-- p_now existe para os testes (mudança de hora); a API pública usa now().
create function private.slot_grid(p_from date, p_to date, p_now timestamptz default now())
returns table (starts_at timestamptz)
language sql stable security definer set search_path = '' as $$
  with s as (
    select min_notice_minutes, max_advance_days from public.settings
  ),
  days as (
    select d::date as day
    from generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') d
  ),
  local_slots as (
    select distinct g as local_start
    from days
    join public.weekly_hours wh on wh.weekday = extract(isodow from days.day)
    cross join lateral generate_series(
      days.day + wh.start_time,
      days.day + wh.end_time - interval '1 hour',
      interval '1 hour'
    ) g
  )
  select (ls.local_start at time zone 'Europe/Lisbon') as starts_at
  from local_slots ls
  cross join s
  where (ls.local_start at time zone 'Europe/Lisbon') >= p_now + make_interval(mins => s.min_notice_minutes)
    and (ls.local_start at time zone 'Europe/Lisbon') <= p_now + make_interval(days => s.max_advance_days)
    and not exists (
      select 1 from public.time_off t
      where tstzrange(t.starts_at, t.ends_at) && tstzrange(
        ls.local_start at time zone 'Europe/Lisbon',
        (ls.local_start at time zone 'Europe/Lisbon') + interval '1 hour'
      )
    )
  order by 1;
$$;

-- Público: horas livres entre duas datas (máx. 92 dias).
create function public.available_slots(p_from date, p_to date)
returns table (starts_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select g.starts_at
  from private.slot_grid(p_from, least(p_to, p_from + 92)) g
  where not exists (
    select 1 from public.appointments a
    where a.status = 'confirmed'
      and tstzrange(a.starts_at, a.ends_at) && tstzrange(g.starts_at, g.starts_at + interval '1 hour')
  )
  order by 1;
$$;

-- Só o servidor (service_role) chama. Devolve {ok, error|appointment_id, cancel_token}.
-- Erros: invalid_phone, invalid_name, invalid_email, invalid_service, blocked,
-- outside_window, slot_taken, guest_limit, phone_in_use.
-- p_user_id: utilizadora autenticada (sem limite); null = convidada (limite de 1 futura).
create function public.book_appointment(
  p_service uuid,
  p_starts_at timestamptz,
  p_name text,
  p_phone text,
  p_email text default null,
  p_user_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_service public.services;
  v_client public.clients;
  v_day date;
  v_token text;
  v_hash text;
  v_id uuid;
begin
  if p_phone is null or p_phone !~ '^\+[1-9][0-9]{7,14}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid_phone');
  end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 100 then
    return jsonb_build_object('ok', false, 'error', 'invalid_name');
  end if;
  if p_email is not null and (char_length(p_email) > 254 or p_email !~ '^[^@\s]+@[^@\s]+$') then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;

  select * into v_service from public.services where id = p_service and active;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_service');
  end if;

  -- serializa pedidos do mesmo telemóvel (limite de convidada sem corridas)
  perform pg_advisory_xact_lock(hashtextextended(p_phone, 0));

  if p_user_id is not null then
    select * into v_client from public.clients where user_id = p_user_id;
  end if;
  if v_client.id is null then
    select * into v_client from public.clients where phone = p_phone;
    if v_client.id is not null and v_client.user_id is not null
       and v_client.user_id is distinct from p_user_id and p_user_id is not null then
      return jsonb_build_object('ok', false, 'error', 'phone_in_use');
    end if;
  end if;

  if v_client.id is not null and v_client.blocked then
    return jsonb_build_object('ok', false, 'error', 'blocked');
  end if;

  v_day := (p_starts_at at time zone 'Europe/Lisbon')::date;
  if not exists (
    select 1 from private.slot_grid(v_day, v_day) g where g.starts_at = p_starts_at
  ) then
    return jsonb_build_object('ok', false, 'error', 'outside_window');
  end if;

  if exists (
    select 1 from public.appointments a
    where a.status = 'confirmed'
      and tstzrange(a.starts_at, a.ends_at) && tstzrange(p_starts_at, p_starts_at + interval '1 hour')
  ) then
    return jsonb_build_object('ok', false, 'error', 'slot_taken');
  end if;

  if p_user_id is null and v_client.id is not null and exists (
    select 1 from public.appointments a
    where a.client_id = v_client.id and a.status = 'confirmed' and a.starts_at > now()
  ) then
    return jsonb_build_object('ok', false, 'error', 'guest_limit');
  end if;

  -- convidada com email recebe token de cancelamento; só o hash fica na BD
  if p_user_id is null and p_email is not null then
    v_token := encode(extensions.gen_random_bytes(32), 'hex');
    v_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');
  end if;

  begin
    if v_client.id is null then
      insert into public.clients (user_id, name, phone, email)
      values (p_user_id, btrim(p_name), p_phone, p_email)
      returning * into v_client;
    else
      update public.clients
      set user_id = coalesce(user_id, p_user_id),
          email = coalesce(email, p_email)
      where id = v_client.id;
    end if;

    insert into public.appointments
      (client_id, service_id, starts_at, ends_at, origin, cancel_token_hash, price_cents)
    values
      (v_client.id, v_service.id, p_starts_at, p_starts_at + interval '1 hour', 'online', v_hash, v_service.price_cents)
    returning id into v_id;
  exception when exclusion_violation then
    -- corrida: outra marcação ganhou (a cliente nova, se houver, é desfeita)
    return jsonb_build_object('ok', false, 'error', 'slot_taken');
  end;

  return jsonb_build_object('ok', true, 'appointment_id', v_id, 'cancel_token', v_token);
end;
$$;

-- Só o servidor chama, com a identidade já verificada.
-- Três formas: token (convidada), utilizadora (dona da marcação ou admin).
-- Clientes: só até cancel_window_hours antes. Admin: sempre.
-- Erros: not_found, not_cancellable, too_late.
create function public.cancel_appointment(
  p_appointment uuid default null,
  p_token text default null,
  p_user_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_a public.appointments;
  v_window interval;
  v_by text := 'client';
  v_admin boolean := false;
begin
  select make_interval(hours => cancel_window_hours) into v_window from public.settings;

  if p_token is not null then
    select * into v_a from public.appointments
    where cancel_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
      and (p_appointment is null or id = p_appointment)
    for update;
  elsif p_appointment is not null and p_user_id is not null then
    select * into v_a from public.appointments where id = p_appointment for update;
    if found then
      v_admin := exists (select 1 from public.admins where user_id = p_user_id);
      if not v_admin and not exists (
        select 1 from public.clients c where c.id = v_a.client_id and c.user_id = p_user_id
      ) then
        v_a := null;
      end if;
    end if;
  end if;

  if v_a.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_a.status <> 'confirmed' then
    return jsonb_build_object('ok', false, 'error', 'not_cancellable');
  end if;
  if not v_admin and v_a.starts_at - now() < v_window then
    return jsonb_build_object('ok', false, 'error', 'too_late');
  end if;

  if v_admin then v_by := 'admin'; end if;

  update public.appointments
  set status = 'cancelled', cancelled_by = v_by, cancelled_at = now(), cancel_token_hash = null
  where id = v_a.id;

  return jsonb_build_object('ok', true, 'appointment_id', v_a.id);
end;
$$;

-- Permissões: a API pública só vê disponibilidade. Escrita só pelo servidor.
revoke all on function private.slot_grid(date, date, timestamptz) from public, anon, authenticated;
revoke all on function public.available_slots(date, date) from public;
grant execute on function public.available_slots(date, date) to anon, authenticated, service_role;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;
revoke all on function public.book_appointment(uuid, timestamptz, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.book_appointment(uuid, timestamptz, text, text, text, uuid) to service_role;
revoke all on function public.cancel_appointment(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.cancel_appointment(uuid, text, uuid) to service_role;
