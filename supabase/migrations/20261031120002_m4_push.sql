-- M4: notificações push para a Catarina (Web Push).
-- Subscrições por dispositivo, só de admins. O envio é feito pela app (chave VAPID privada).

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
grant select, insert, delete on public.push_subscriptions to authenticated;

-- Cada admin vê e gere só os seus dispositivos; a app lê todos com a chave secreta para enviar.
create policy push_own_read on public.push_subscriptions for select
  using (user_id = (select auth.uid()) and (select public.is_admin()));
create policy push_own_insert on public.push_subscriptions for insert
  with check (user_id = (select auth.uid()) and (select public.is_admin()));
create policy push_own_delete on public.push_subscriptions for delete
  using (user_id = (select auth.uid()));

-- Marcação online nova ou cancelada pela cliente: pede à app para avisar a Catarina.
-- Cobre todos os caminhos (marcar, cancelar por link, conta) sem tocar no código de cada um.
-- Sem os segredos no Vault, não faz nada. Nunca falha a marcação.
create function private.notify_admin_push() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_url text;
  v_secret text;
  v_evento text;
begin
  if tg_op = 'INSERT' and new.origin = 'online' and new.status = 'confirmed' then
    v_evento := 'nova';
  elsif tg_op = 'UPDATE' and old.status = 'confirmed' and new.status = 'cancelled'
        and new.cancelled_by = 'client' then
    v_evento := 'cancelada';
  else
    return new;
  end if;
  begin
    select decrypted_secret into v_url from vault.decrypted_secrets where name = 'site_url';
    select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'cron_secret';
    if v_url is not null and v_secret is not null then
      perform net.http_post(
        url := v_url || '/api/push',
        headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret, 'Content-Type', 'application/json'),
        body := jsonb_build_object('id', new.id, 'evento', v_evento),
        timeout_milliseconds := 10000
      );
    end if;
  exception when others then
    null;
  end;
  return new;
end;
$$;
revoke all on function private.notify_admin_push() from public, anon, authenticated;

create trigger appointments_push after insert or update of status on public.appointments
  for each row execute function private.notify_admin_push();
