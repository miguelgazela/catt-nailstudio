-- M1: RLS em todas as tabelas. Público lê serviços ativos, definições e horário
-- (a disponibilidade vem de available_slots). Cliente lê só o que é seu.
-- Admin lê e escreve tudo. Clientes nunca escrevem direto: só via funções.

alter table public.settings enable row level security;
alter table public.services enable row level security;
alter table public.weekly_hours enable row level security;
alter table public.time_off enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;
alter table public.admins enable row level security;
alter table public.audit_log enable row level security;

-- Privilégios base: nada para anon além do que é público.
revoke all on all tables in schema public from anon, authenticated;
grant select on public.settings, public.services, public.weekly_hours to anon, authenticated;
grant select, insert, update, delete on
  public.settings, public.services, public.weekly_hours, public.time_off,
  public.clients, public.appointments to authenticated;
grant select on public.admins, public.audit_log to authenticated;

-- settings, services, weekly_hours: leitura pública, escrita admin
create policy settings_read on public.settings for select using (true);
create policy settings_admin_update on public.settings for update
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy services_read_active on public.services for select
  using (active or (select public.is_admin()));
create policy services_admin_write on public.services for all
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy weekly_hours_read on public.weekly_hours for select using (true);
create policy weekly_hours_admin_write on public.weekly_hours for all
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- time_off: só admin (os motivos não são públicos)
create policy time_off_admin on public.time_off for all
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- clients: a cliente vê a sua ficha; admin tudo
create policy clients_own_read on public.clients for select
  using (user_id = (select auth.uid()));
create policy clients_admin on public.clients for all
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- appointments: a cliente vê as suas; admin tudo; ninguém mais
create policy appointments_own_read on public.appointments for select
  using (exists (
    select 1 from public.clients c
    where c.id = appointments.client_id and c.user_id = (select auth.uid())
  ));
create policy appointments_admin on public.appointments for all
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- admins: cada admin vê só a própria linha (para o middleware). Sem escrita pela API.
create policy admins_self_read on public.admins for select
  using (user_id = (select auth.uid()));

-- audit_log: só admin lê. Escrito por triggers.
create policy audit_log_admin_read on public.audit_log for select
  using ((select public.is_admin()));
