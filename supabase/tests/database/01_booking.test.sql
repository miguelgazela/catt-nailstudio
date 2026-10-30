begin;
select plan(27);

-- Horário de teste: igual ao real, sem depender do seed.
delete from public.weekly_hours;
insert into public.weekly_hours (weekday, start_time, end_time) values
  (1, '09:00', '12:00'), (1, '14:30', '18:30'),
  (2, '09:00', '12:00'), (2, '14:30', '18:30'),
  (6, '09:00', '13:00');
update public.settings set min_notice_minutes = 120, max_advance_days = 42, cancel_window_hours = 24;

create temp table ctx as
select
  (date_trunc('week', now() at time zone 'Europe/Lisbon')::date + 7) as mon,
  (select id from public.services order by sort_order limit 1) as svc;

create function pg_temp.at(p_day date, p_time time) returns timestamptz
language sql as $$ select (p_day + p_time) at time zone 'Europe/Lisbon' $$;

-- Disponibilidade
select is(
  (select array_agg(to_char(starts_at at time zone 'Europe/Lisbon', 'HH24:MI') order by starts_at)
   from public.available_slots((select mon from ctx), (select mon from ctx))),
  array['09:00','10:00','11:00','14:30','15:30','16:30','17:30'],
  'segunda: horas a contar do início de cada período'
);
select is(
  (select count(*)::int from public.available_slots((select mon + 6 from ctx), (select mon + 6 from ctx))),
  0, 'domingo fechado'
);
select is(
  (select array_agg(to_char(starts_at at time zone 'Europe/Lisbon', 'HH24:MI') order by starts_at)
   from public.available_slots((select mon + 5 from ctx), (select mon + 5 from ctx))),
  array['09:00','10:00','11:00','12:00'], 'sábado 9 às 13'
);

-- Reservar
select is(
  public.book_appointment((select svc from ctx), pg_temp.at((select mon from ctx), '10:00'), 'Ana', '+351912345678', 'ana@example.com') ->> 'ok',
  'true', 'convidada marca'
);
select is(
  (select count(*)::int from public.available_slots((select mon from ctx), (select mon from ctx))),
  6, 'a hora ocupada sai da disponibilidade'
);
select is(
  public.book_appointment((select svc from ctx), pg_temp.at((select mon from ctx), '10:00'), 'Rita', '+351934567890') ->> 'error',
  'slot_taken', 'segunda pessoa na mesma hora: slot_taken'
);
select throws_ok(
  format($f$insert into public.appointments (client_id, service_id, starts_at, ends_at, price_cents)
    select client_id, service_id, starts_at, ends_at, price_cents from public.appointments limit 1$f$),
  '23P01', null, 'a BD recusa sobreposição mesmo sem passar pela função'
);
select is(
  public.book_appointment((select svc from ctx), pg_temp.at((select mon from ctx), '11:00'), 'Ana', '+351912345678') ->> 'error',
  'guest_limit', 'convidada: só 1 marcação futura por telemóvel'
);
select is(
  (select count(*)::int from public.clients where phone = '+351912345678'), 1, 'cliente reutilizada pelo telemóvel'
);

-- Token de cancelamento
select ok(
  (select cancel_token_hash ~ '^[0-9a-f]{64}$' from public.appointments limit 1), 'token guardado como hash sha256'
);

-- Validações
select is(public.book_appointment((select svc from ctx), pg_temp.at((select mon from ctx), '11:00'), 'X', '912345678') ->> 'error',
  'invalid_phone', 'telemóvel tem de estar em E.164');
select is(public.book_appointment((select svc from ctx), pg_temp.at((select mon from ctx), '03:00'), 'X', '+351911111111') ->> 'error',
  'outside_window', 'fora do horário');
select is(public.book_appointment((select svc from ctx), pg_temp.at((select mon + 56 from ctx), '10:00'), 'X', '+351911111111') ->> 'error',
  'outside_window', 'além da antecedência máxima');
select is(public.book_appointment((select svc from ctx), pg_temp.at((select mon from ctx), '10:30'), 'X', '+351911111111') ->> 'error',
  'outside_window', 'hora que não está na grelha');
select is(public.book_appointment(gen_random_uuid(), pg_temp.at((select mon from ctx), '11:00'), 'X', '+351911111111') ->> 'error',
  'invalid_service', 'serviço inexistente');

-- Número bloqueado
insert into public.clients (name, phone, blocked) values ('Bloqueada', '+351966666666', true);
select is(public.book_appointment((select svc from ctx), pg_temp.at((select mon from ctx), '11:00'), 'Bloqueada', '+351966666666') ->> 'error',
  'blocked', 'número bloqueado não marca');

-- Conta (sem limite de 1 futura)
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'a@example.com');
select is(public.book_appointment((select svc from ctx), pg_temp.at((select mon from ctx), '11:00'), 'Conta', '+351922222222', null, '00000000-0000-0000-0000-0000000000a1') ->> 'ok',
  'true', 'com conta: 1.ª marcação');
select is(public.book_appointment((select svc from ctx), pg_temp.at((select mon from ctx), '14:30'), 'Conta', '+351922222222', null, '00000000-0000-0000-0000-0000000000a1') ->> 'ok',
  'true', 'com conta: sem limite de 1 futura');

-- Cancelar
select is(public.cancel_appointment(null, 'token-errado', null) ->> 'error', 'not_found', 'token errado');
select is(
  public.cancel_appointment((select id from public.appointments where starts_at = pg_temp.at((select mon from ctx), '11:00')),
    null, '00000000-0000-0000-0000-0000000000a2') ->> 'error',
  'not_found', 'outra utilizadora não cancela marcações alheias'
);
select is(
  public.cancel_appointment((select id from public.appointments where starts_at = pg_temp.at((select mon from ctx), '11:00')),
    null, '00000000-0000-0000-0000-0000000000a1') ->> 'ok',
  'true', 'dona cancela com mais de 24 h'
);
select is((select count(*)::int from public.available_slots((select mon from ctx), (select mon from ctx)) where to_char(starts_at at time zone 'Europe/Lisbon', 'HH24:MI') = '11:00'),
  1, 'a hora cancelada volta a ficar livre');

-- Menos de 24 h: cliente não pode, admin pode
insert into public.clients (id, name, phone, user_id) values ('00000000-0000-0000-0000-0000000000c3', 'Perto', '+351933333333', null);
insert into public.appointments (id, client_id, service_id, starts_at, ends_at, price_cents)
select '00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c3', (select svc from ctx),
  date_trunc('hour', now()) + interval '5 hours', date_trunc('hour', now()) + interval '6 hours', 1500;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a3', 'perto@example.com'), ('00000000-0000-0000-0000-0000000000ad', 'admin@example.com');
update public.clients set user_id = '00000000-0000-0000-0000-0000000000a3' where id = '00000000-0000-0000-0000-0000000000c3';
insert into public.admins (user_id) values ('00000000-0000-0000-0000-0000000000ad');
select is(public.cancel_appointment('00000000-0000-0000-0000-0000000000d3', null, '00000000-0000-0000-0000-0000000000a3') ->> 'error',
  'too_late', 'cliente não cancela com menos de 24 h');
select is(public.cancel_appointment('00000000-0000-0000-0000-0000000000d3', null, '00000000-0000-0000-0000-0000000000ad') ->> 'ok',
  'true', 'admin cancela sempre');
select is((select cancelled_by from public.appointments where id = '00000000-0000-0000-0000-0000000000d3'), 'admin', 'cancelado por admin');
select is(public.cancel_appointment('00000000-0000-0000-0000-0000000000d3', null, '00000000-0000-0000-0000-0000000000ad') ->> 'error',
  'not_cancellable', 'já cancelada');

-- Folgas
insert into public.time_off (starts_at, ends_at, reason)
values (pg_temp.at((select mon + 1 from ctx), '09:30'), pg_temp.at((select mon + 1 from ctx), '10:30'), 'teste');
select is(
  (select array_agg(to_char(starts_at at time zone 'Europe/Lisbon', 'HH24:MI') order by starts_at)
   from public.available_slots((select mon + 1 from ctx), (select mon + 1 from ctx))),
  array['11:00','14:30','15:30','16:30','17:30'], 'folga retira as horas que toca'
);

select * from finish();
rollback;
