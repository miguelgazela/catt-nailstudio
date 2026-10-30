-- M1: privacidade. Registo de alterações, contador de faltas, anonimização e limpeza.

-- Regista alterações (quem, o quê, que colunas). Nunca guarda valores pessoais.
create function private.log_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_cols jsonb;
  v_id text;
begin
  if tg_op = 'UPDATE' then
    select coalesce(jsonb_agg(n.key order by n.key), '[]'::jsonb) into v_cols
    from jsonb_each(to_jsonb(new)) n
    join jsonb_each(to_jsonb(old)) o using (key)
    where n.value is distinct from o.value;
    if v_cols = '[]'::jsonb then
      return new;
    end if;
  end if;
  v_id := coalesce(to_jsonb(new) ->> 'id', to_jsonb(old) ->> 'id');
  insert into public.audit_log (actor, action, entity, entity_id, details)
  values ((select auth.uid()), lower(tg_op), tg_table_name, v_id,
          case when tg_op = 'UPDATE' then jsonb_build_object('columns', v_cols) end);
  return coalesce(new, old);
end;
$$;

create trigger audit_appointments after insert or update or delete on public.appointments
  for each row execute function private.log_change();
create trigger audit_services after insert or update or delete on public.services
  for each row execute function private.log_change();
create trigger audit_weekly_hours after insert or update or delete on public.weekly_hours
  for each row execute function private.log_change();
create trigger audit_time_off after insert or update or delete on public.time_off
  for each row execute function private.log_change();
create trigger audit_settings after update on public.settings
  for each row execute function private.log_change();
create trigger audit_clients after update or delete on public.clients
  for each row execute function private.log_change();

-- Mantém no_show_count coerente com o estado das marcações.
create function private.sync_no_show() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'no_show' and old.status <> 'no_show' then
    update public.clients set no_show_count = no_show_count + 1 where id = new.client_id;
  elsif old.status = 'no_show' and new.status <> 'no_show' then
    update public.clients set no_show_count = greatest(no_show_count - 1, 0) where id = new.client_id;
  end if;
  return new;
end;
$$;
create trigger appointments_no_show after update of status on public.appointments
  for each row execute function private.sync_no_show();

-- Anonimiza: o histórico fica (as contas da agenda não mudam), os dados pessoais saem.
create function private.anonymize_client(p_client uuid, p_actor uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.clients
  set name = 'Cliente apagada', phone = null, email = null, notes = null,
      user_id = null, blocked = false, anonymized_at = now()
  where id = p_client and anonymized_at is null;
  if not found then
    return;
  end if;
  update public.appointments set cancel_token_hash = null, note = null where client_id = p_client;
  insert into public.audit_log (actor, action, entity, entity_id)
  values (p_actor, 'anonymize', 'clients', p_client::text);
end;
$$;

-- Botão "Apagar cliente" do painel. Só admin.
create function public.anonymize_client(p_client uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not (select public.is_admin()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform private.anonymize_client(p_client, (select auth.uid()));
end;
$$;
revoke all on function public.anonymize_client(uuid) from public, anon;
grant execute on function public.anonymize_client(uuid) to authenticated, service_role;

-- Clientes sem atividade há 24 meses: anonimizar (job mensal).
create function private.anonymize_inactive_clients() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_n integer := 0;
begin
  for v_id in
    select c.id from public.clients c
    where c.anonymized_at is null
      and c.created_at < now() - interval '24 months'
      and not exists (
        select 1 from public.appointments a
        where a.client_id = c.id and a.starts_at > now() - interval '24 months'
      )
  loop
    perform private.anonymize_client(v_id, null);
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

-- Tokens de cancelamento de marcações que já passaram (job diário).
create function private.purge_stale_tokens() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_n integer;
begin
  update public.appointments set cancel_token_hash = null
  where cancel_token_hash is not null and starts_at < now();
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function private.log_change(), private.sync_no_show(),
  private.anonymize_client(uuid, uuid), private.anonymize_inactive_clients(),
  private.purge_stale_tokens() from public, anon, authenticated;

-- Jobs (pg_cron).
create extension if not exists pg_cron;
select cron.schedule('purge-stale-tokens', '15 3 * * *', 'select private.purge_stale_tokens()');
select cron.schedule('anonymize-inactive-clients', '30 3 1 * *', 'select private.anonymize_inactive_clients()');
