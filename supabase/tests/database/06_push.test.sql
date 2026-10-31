begin;
select plan(7);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000b2', 'cliente@example.com');
insert into public.admins (user_id) values ('00000000-0000-0000-0000-0000000000a1');

-- admin guarda o seu dispositivo
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
select lives_ok($$insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values ('00000000-0000-0000-0000-0000000000a1', 'https://push.example/1', 'k', 'a')$$, 'admin guarda subscrição');
select is((select count(*)::int from public.push_subscriptions), 1, 'admin vê a sua');
select throws_ok($$insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values ('00000000-0000-0000-0000-0000000000b2', 'https://push.example/2', 'k', 'a')$$, '42501', null, 'admin não guarda em nome de outra');

-- cliente que não é admin
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', true);
select is((select count(*)::int from public.push_subscriptions), 0, 'cliente não vê subscrições');
select throws_ok($$insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values ('00000000-0000-0000-0000-0000000000b2', 'https://push.example/3', 'k', 'a')$$, '42501', null, 'cliente não pode subscrever');
reset role;

-- o trigger nunca atrapalha a marcação, mesmo sem segredos no Vault
select lives_ok($$select public.book_appointment(
  (select id from public.services order by sort_order limit 1),
  date_trunc('day', now() + interval '10 days') + interval '30 hours',
  'Teste Push', '+351911000999', null, null)$$, 'marcar funciona com o trigger de push');

set local role anon;
select throws_ok($$select * from public.push_subscriptions$$, '42501', null, 'público não lê subscrições');
reset role;

select * from finish();
rollback;
