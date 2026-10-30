begin;
select plan(22);

-- Dados (como superutilizador)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@example.com');
insert into public.admins (user_id) values ('00000000-0000-0000-0000-0000000000ad');
insert into public.clients (id, user_id, name, phone) values
  ('00000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-00000000000a', 'Ana', '+351911111111'),
  ('00000000-0000-0000-0000-0000000000cb', '00000000-0000-0000-0000-00000000000b', 'Beatriz', '+351922222222'),
  ('00000000-0000-0000-0000-0000000000cc', null, 'Convidada', '+351933333333');
insert into public.services (id, name, price_cents, active) values
  ('00000000-0000-0000-0000-0000000000f1', 'Inativo', 1000, false);
insert into public.appointments (client_id, service_id, starts_at, ends_at, price_cents)
select c.id, (select id from public.services where active order by sort_order limit 1),
  date_trunc('day', now()) + interval '10 days' + (row_number() over ())::int * interval '1 hour',
  date_trunc('day', now()) + interval '10 days' + (row_number() over ())::int * interval '1 hour' + interval '1 hour', 1500
from public.clients c;
insert into public.time_off (starts_at, ends_at, reason) values (now() + interval '30 days', now() + interval '31 days', 'férias');

-- Público (anon)
set local role anon;
select is((select count(*)::int from public.services), 3, 'público vê só serviços ativos');
select is((select count(*)::int from public.settings), 1, 'público lê definições');
select is((select count(*)::int from public.weekly_hours), 11, 'público lê horário');
select throws_ok('select * from public.clients', '42501', null, 'público não lê clients');
select throws_ok('select * from public.appointments', '42501', null, 'público não lê appointments');
select throws_ok('select * from public.time_off', '42501', null, 'público não lê time_off');
select throws_ok('select * from public.audit_log', '42501', null, 'público não lê audit_log');
select throws_ok('select * from public.admins', '42501', null, 'público não lê admins');
select lives_ok($$select * from public.available_slots(current_date, current_date + 7)$$, 'público lê disponibilidade');
select throws_ok($$select public.book_appointment(gen_random_uuid(), now(), 'x', '+351911111119')$$, '42501', null, 'público não chama book_appointment direto');
select throws_ok($$select public.cancel_appointment(gen_random_uuid())$$, '42501', null, 'público não chama cancel_appointment direto');
reset role;

-- Cliente A (autenticada)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select is((select count(*)::int from public.clients), 1, 'cliente só vê a sua ficha');
select is((select name from public.clients), 'Ana', 'e é a dela');
select is((select count(*)::int from public.appointments), 1, 'cliente só vê as suas marcações');
select is((select count(*)::int from public.time_off), 0, 'cliente não vê folgas');
select is((select count(*)::int from public.audit_log), 0, 'cliente não vê o registo');
select is((select count(*)::int from public.admins), 0, 'cliente não é admin');
select throws_ok($$insert into public.appointments (client_id, service_id, starts_at, ends_at, price_cents)
  values ('00000000-0000-0000-0000-0000000000ca', (select id from public.services limit 1), now() + interval '40 days', now() + interval '40 days 1 hour', 1)$$,
  '42501', null, 'cliente não insere marcações direto');
update public.clients set name = 'Hacker' where id = '00000000-0000-0000-0000-0000000000cb';
select throws_ok($$select public.anonymize_client('00000000-0000-0000-0000-0000000000cb')$$, '42501', null, 'cliente não anonimiza');
reset role;
select is((select name from public.clients where id = '00000000-0000-0000-0000-0000000000cb'), 'Beatriz', 'cliente não altera a ficha de outra');

-- Admin
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}', true);
select is((select count(*)::int from public.clients), 3, 'admin vê todas as clientes');
select is((select count(*)::int from public.time_off), 1, 'admin vê folgas');
reset role;

select * from finish();
rollback;
