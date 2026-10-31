-- M5: emails. Aviso à Catarina, controlo de lembretes enviados e job que chama a app.

alter table public.settings
  add column notify_on_booking boolean not null default true;

alter table public.appointments
  add column reminder_sent_at timestamptz;

-- A cada 30 min, a base de dados pede à app para enviar os lembretes em falta.
-- O endereço e o segredo ficam no Vault (nunca no repositório); sem eles, o job não faz nada.
create extension if not exists pg_net;

create function private.call_reminders() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'site_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'cron_secret';
  if v_url is null or v_secret is null then
    return;
  end if;
  perform net.http_post(
    url := v_url || '/api/lembretes',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 20000
  );
end;
$$;
revoke all on function private.call_reminders() from public, anon, authenticated;

select cron.schedule('send-reminders', '*/30 * * * *', 'select private.call_reminders()');
