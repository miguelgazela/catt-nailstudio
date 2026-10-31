-- M3: conta da cliente. Ligar marcações antigas ao telemóvel, apagar conta e limpeza.

-- book_appointment: igual ao do M1, mas uma conta só se liga à ficha de uma convidada com o
-- mesmo telemóvel se o email coincidir (ou se a ficha não tiver email). Antes, qualquer
-- conta que escrevesse o telemóvel de outra pessoa herdava a ficha dela.
create or replace function public.book_appointment(
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
    if v_client.id is not null and p_user_id is not null and (
         v_client.user_id is not null
         -- ficha de convidada com outro email: não se liga a esta conta (M3)
         or (v_client.email is not null
             and lower(v_client.email) is distinct from lower(coalesce(p_email, '')))
       ) then
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


-- Cria a ficha da conta, ou liga-a à ficha antiga (marcações sem conta) com o mesmo telemóvel.
-- Só o servidor chama. Devolve {ok, linked, existing} ou {ok:false, error}.
-- Erros: invalid_phone, invalid_name, phone_in_use (telemóvel de outra conta ou de uma ficha com
-- outro email: a mensagem é a mesma para não revelar quem tem marcações).
create function public.claim_client(
  p_user_id uuid,
  p_email text,
  p_name text,
  p_phone text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_client public.clients;
  v_n integer := 0;
begin
  if p_phone is null or p_phone !~ '^\+[1-9][0-9]{7,14}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid_phone');
  end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 100 then
    return jsonb_build_object('ok', false, 'error', 'invalid_name');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_phone, 0));

  select * into v_client from public.clients where user_id = p_user_id;
  if found then
    return jsonb_build_object('ok', true, 'linked', 0, 'existing', true);
  end if;

  select * into v_client from public.clients where phone = p_phone;
  if found then
    if v_client.user_id is not null
       or (v_client.email is not null
           and lower(v_client.email) is distinct from lower(coalesce(p_email, ''))) then
      return jsonb_build_object('ok', false, 'error', 'phone_in_use');
    end if;
    update public.clients
    set user_id = p_user_id, email = coalesce(email, lower(p_email))
    where id = v_client.id;
    select count(*) into v_n from public.appointments where client_id = v_client.id;
  else
    insert into public.clients (user_id, name, phone, email)
    values (p_user_id, btrim(p_name), p_phone, lower(p_email));
  end if;

  return jsonb_build_object('ok', true, 'linked', v_n, 'existing', false);
end;
$$;

-- "Apagar conta": cancela as marcações futuras e anonimiza a ficha (o histórico fica sem dados
-- pessoais, como na anonimização do painel). O servidor apaga depois o utilizador do Auth.
create function public.delete_my_data(p_user_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_client public.clients;
  v_cancelled integer;
begin
  select * into v_client from public.clients where user_id = p_user_id;
  if not found then
    return jsonb_build_object('ok', true, 'cancelled', 0);
  end if;
  with c as (
    update public.appointments
    set status = 'cancelled', cancelled_by = 'client', cancelled_at = now(), cancel_token_hash = null
    where client_id = v_client.id and status = 'confirmed' and starts_at > now()
    returning 1
  )
  select count(*) into v_cancelled from c;
  perform private.anonymize_client(v_client.id, p_user_id);
  return jsonb_build_object('ok', true, 'cancelled', v_cancelled);
end;
$$;

-- Utilizadores do Auth criados por um pedido de link e nunca confirmados (o link morre em 1 hora):
-- apagar ao fim de 2 dias. Nunca toca em quem tem ficha ou é admin.
create function private.purge_unconfirmed_users() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_n integer;
begin
  delete from auth.users u
  where u.email_confirmed_at is null
    and u.last_sign_in_at is null
    and u.created_at < now() - interval '2 days'
    and not exists (select 1 from public.clients c where c.user_id = u.id)
    and not exists (select 1 from public.admins a where a.user_id = u.id);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.claim_client(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.claim_client(uuid, text, text, text) to service_role;
revoke all on function public.delete_my_data(uuid) from public, anon, authenticated;
grant execute on function public.delete_my_data(uuid) to service_role;
revoke all on function private.purge_unconfirmed_users() from public, anon, authenticated;

select cron.schedule('purge-unconfirmed-users', '45 3 * * *', 'select private.purge_unconfirmed_users()');
