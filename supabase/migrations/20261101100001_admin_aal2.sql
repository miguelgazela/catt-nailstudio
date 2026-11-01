-- O painel já exige o segundo passo (código da app autenticadora, nível aal2) na app.
-- Agora também a base de dados: quem só tem o link do email (aal1) não lê nem altera
-- nada de admin, mesmo chamando a API diretamente.
-- admins_self_read não usa is_admin(), por isso a app continua a saber que a pessoa é
-- admin antes do código (para a mandar para /admin/mfa).
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()))
    and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2';
$$;
