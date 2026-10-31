begin;
select plan(17);

insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000a1', 'm3ana@example.com', now()),
  ('00000000-0000-0000-0000-0000000000a2', 'm3outra@example.com', now()),
  ('00000000-0000-0000-0000-0000000000a3', 'm3terceira@example.com', now());
insert into public.clients (id, name, phone, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'Ana', '+351911111111', 'm3ana@example.com'),
  ('00000000-0000-0000-0000-0000000000c2', 'Sem email', '+351922222222', null),
  ('00000000-0000-0000-0000-0000000000c3', 'Outro email', '+351933333333', 'm3dono@example.com');
insert into public.appointments (client_id, service_id, starts_at, ends_at, price_cents, status)
select c.id, (select id from public.services limit 1), t.s, t.s + interval '1 hour', 1500, t.st::public.appointment_status
from (values
  ('00000000-0000-0000-0000-0000000000c1'::uuid, now() + interval '10 days', 'confirmed'),
  ('00000000-0000-0000-0000-0000000000c1'::uuid, now() - interval '10 days', 'done'),
  ('00000000-0000-0000-0000-0000000000c3'::uuid, now() + interval '11 days', 'confirmed')
) as t(cid, s, st)
join public.clients c on c.id = t.cid;

-- claim_client
select is(public.claim_client('00000000-0000-0000-0000-0000000000a1', 'm3ana@example.com', 'Ana', '+351911111111') ->> 'linked', '2',
  'mesmo telemóvel e email: liga as 2 marcações antigas');
select is((select user_id from public.clients where id = '00000000-0000-0000-0000-0000000000c1'), '00000000-0000-0000-0000-0000000000a1'::uuid, 'ficha ficou da conta');
select is(public.claim_client('00000000-0000-0000-0000-0000000000a1', 'm3ana@example.com', 'Ana', '+351900000000') ->> 'existing', 'true', 'conta já com ficha: nada muda');
select is(public.claim_client('00000000-0000-0000-0000-0000000000a2', 'm3outra@example.com', 'Outra', '+351911111111') ->> 'error', 'phone_in_use', 'telemóvel de outra conta recusado');
select is(public.claim_client('00000000-0000-0000-0000-0000000000a2', 'm3outra@example.com', 'Outra', '+351933333333') ->> 'error', 'phone_in_use', 'ficha com outro email não é herdada (mesmo erro)');
select is((select user_id from public.clients where id = '00000000-0000-0000-0000-0000000000c3'), null, 'ficha com outro email continua sem conta');
select is(public.claim_client('00000000-0000-0000-0000-0000000000a2', 'm3outra@example.com', 'Outra', '+351922222222') ->> 'linked', '0', 'ficha sem email liga-se e fica com o email da conta');
select is((select email from public.clients where id = '00000000-0000-0000-0000-0000000000c2'), 'm3outra@example.com', 'email da conta gravado');
select is(public.claim_client('00000000-0000-0000-0000-0000000000a2', 'm3outra@example.com', 'X', 'abc') ->> 'error', 'invalid_phone', 'telemóvel inválido');

-- book_appointment com conta não herda ficha de outro email
select is(public.book_appointment((select id from public.services limit 1), now(), 'X', '+351933333333', 'm3terceira@example.com', '00000000-0000-0000-0000-0000000000a3') ->> 'error', 'phone_in_use', 'book com conta: ficha de outro email recusada');

-- delete_my_data
select is(public.delete_my_data('00000000-0000-0000-0000-0000000000a1') ->> 'cancelled', '1', 'apagar conta cancela a marcação futura');
select is((select name || coalesce(phone, '-') from public.clients where id = '00000000-0000-0000-0000-0000000000c1'), 'Cliente apagada-', 'ficha anonimizada');
select is((select count(*)::int from public.appointments where client_id = '00000000-0000-0000-0000-0000000000c1' and status = 'confirmed'), 0, 'sem marcações futuras');

-- limpeza de utilizadores nunca confirmados
insert into auth.users (id, email, created_at) values
  ('00000000-0000-0000-0000-0000000000b1', 'm3velho@example.com', now() - interval '3 days'),
  ('00000000-0000-0000-0000-0000000000b2', 'm3novo@example.com', now());
select cmp_ok(private.purge_unconfirmed_users(), '>=', 1, 'corre a limpeza');
select is((select count(*)::int from auth.users where id = '00000000-0000-0000-0000-0000000000b1'), 0, 'apaga o não confirmado com mais de 2 dias');
select is((select count(*)::int from auth.users where id = '00000000-0000-0000-0000-0000000000b2'), 1, 'o recente fica');
select is((select count(*)::int from auth.users where id = '00000000-0000-0000-0000-0000000000a2'), 1, 'quem tem ficha fica');

select * from finish();
rollback;
