begin;
select plan(8);

delete from public.weekly_hours;
insert into public.weekly_hours (weekday, start_time, end_time) values
  (1, '09:00', '12:00'), (1, '14:30', '18:30'), (6, '09:00', '13:00'), (7, '09:00', '12:00');
update public.settings set min_notice_minutes = 0, max_advance_days = 3000;

-- Mudança de hora. Lisboa: UTC+0 no inverno, UTC+1 no verão.
-- 2026: verão acaba domingo 25 out. 2027: verão começa domingo 28 mar e acaba domingo 31 out.
select is((select min(starts_at) from private.slot_grid('2026-10-24', '2026-10-24', '2026-01-01')),
  timestamptz '2026-10-24 08:00:00+00', 'sábado antes do fim do verão: 9:00 = 08:00Z');
select is((select min(starts_at) from private.slot_grid('2026-10-26', '2026-10-26', '2026-01-01')),
  timestamptz '2026-10-26 09:00:00+00', 'segunda depois do fim do verão: 9:00 = 09:00Z');
select is((select min(starts_at) from private.slot_grid('2027-03-27', '2027-03-27', '2026-01-01')),
  timestamptz '2027-03-27 09:00:00+00', 'sábado antes do início do verão: 9:00 = 09:00Z');
select is((select min(starts_at) from private.slot_grid('2027-03-29', '2027-03-29', '2026-01-01')),
  timestamptz '2027-03-29 08:00:00+00', 'segunda depois do início do verão: 9:00 = 08:00Z');
select is((select min(starts_at) from private.slot_grid('2027-03-28', '2027-03-28', '2026-01-01')),
  timestamptz '2027-03-28 08:00:00+00', 'dia da mudança (24 h): 9:00 = 08:00Z');
select is((select min(starts_at) from private.slot_grid('2027-10-31', '2027-10-31', '2026-01-01')),
  timestamptz '2027-10-31 09:00:00+00', 'dia em que acaba o verão (25 h): 9:00 = 09:00Z');
select is((select count(*)::int from private.slot_grid('2027-03-28', '2027-03-28', '2026-01-01')), 3, 'dia da mudança: 3 slots');
select is((select count(*)::int from private.slot_grid('2027-03-29', '2027-03-29', '2026-01-01')), 7, 'segunda a seguir: 7 slots');

select * from finish();
rollback;
