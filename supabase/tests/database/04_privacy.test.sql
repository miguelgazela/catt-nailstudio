begin;
select plan(13);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000ad', 'admin@example.com');
insert into public.admins (user_id) values ('00000000-0000-0000-0000-0000000000ad');
insert into public.clients (id, name, phone, email, notes) values
  ('00000000-0000-0000-0000-0000000000c1', 'Ana', '+351911111111', 'ana@example.com', 'prefere cores claras'),
  ('00000000-0000-0000-0000-0000000000c2', 'Velha', '+351922222222', null, null);
update public.clients set created_at = now() - interval '25 months' where id = '00000000-0000-0000-0000-0000000000c2';
insert into public.appointments (id, client_id, service_id, starts_at, ends_at, price_cents, cancel_token_hash, status)
select '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1',
  (select id from public.services limit 1), now() + interval '10 days', now() + interval '10 days 1 hour', 1500, repeat('a', 64), 'confirmed';
insert into public.appointments (id, client_id, service_id, starts_at, ends_at, price_cents, cancel_token_hash, status)
select '00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1',
  (select id from public.services limit 1), now() - interval '2 days', now() - interval '2 days' + interval '1 hour', 1500, repeat('b', 64), 'done';

select throws_ok($$insert into public.clients (name, phone) values ('X', '912345678')$$, '23514', null, 'telemóvel inválido recusado pela BD');

-- Faltas
update public.appointments set status = 'no_show' where id = '00000000-0000-0000-0000-0000000000d2';
select is((select no_show_count from public.clients where id = '00000000-0000-0000-0000-0000000000c1'), 1, 'falta conta');
update public.appointments set status = 'done' where id = '00000000-0000-0000-0000-0000000000d2';
select is((select no_show_count from public.clients where id = '00000000-0000-0000-0000-0000000000c1'), 0, 'falta anulada descontada');

-- Tokens de marcações passadas
select is(private.purge_stale_tokens(), 1, 'limpa tokens de marcações que já passaram');
select is((select cancel_token_hash from public.appointments where id = '00000000-0000-0000-0000-0000000000d1'), repeat('a', 64), 'token de marcação futura fica');

-- Registo de alterações
update public.services set price_cents = price_cents + 100 where id = (select id from public.services order by sort_order limit 1);
select is((select details from public.audit_log where entity = 'services' and action = 'update' order by id desc limit 1),
  '{"columns": ["price_cents"]}'::jsonb, 'registo guarda a coluna alterada, não o valor');

-- Anonimização (admin)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated","aal":"aal2"}', true);
select lives_ok($$select public.anonymize_client('00000000-0000-0000-0000-0000000000c1')$$, 'admin anonimiza');
reset role;
select is((select name || '|' || coalesce(phone, 'null') || '|' || coalesce(email, 'null') || '|' || coalesce(notes, 'null')
  from public.clients where id = '00000000-0000-0000-0000-0000000000c1'), 'Cliente apagada|null|null|null', 'dados pessoais removidos');
select is((select count(*)::int from public.appointments where client_id = '00000000-0000-0000-0000-0000000000c1'), 2, 'histórico mantém-se');
select is((select cancel_token_hash from public.appointments where id = '00000000-0000-0000-0000-0000000000d1'), null, 'tokens removidos');
select is((select actor::text from public.audit_log where action = 'anonymize' order by id desc limit 1), '00000000-0000-0000-0000-0000000000ad', 'registado quem anonimizou');

-- Inatividade de 24 meses
select is(private.anonymize_inactive_clients(), 1, 'anonimiza clientes inativas há 24 meses');
select is((select name from public.clients where id = '00000000-0000-0000-0000-0000000000c2'), 'Cliente apagada', 'a inativa foi anonimizada');

select * from finish();
rollback;
