-- O link de entrada para o painel (/admin) só é enviado a admins.
-- Usado só pelo servidor (service_role) antes de gerar o link; nunca exposto a clientes.
create or replace function public.is_admin_email(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admins a
    join auth.users u on u.id = a.user_id
    where lower(u.email) = lower(p_email)
  );
$$;

revoke all on function public.is_admin_email(text) from public, anon, authenticated;
grant execute on function public.is_admin_email(text) to service_role;
