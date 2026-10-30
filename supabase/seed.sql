-- Dados iniciais. Horário real (segunda aberta e domingo fechado por confirmar).
-- Serviços e preços são PLACEHOLDERS até a Catarina responder (PLANO secção 7).

insert into public.weekly_hours (weekday, start_time, end_time) values
  (1, '09:00', '12:00'), (1, '14:30', '18:30'),
  (2, '09:00', '12:00'), (2, '14:30', '18:30'),
  (3, '09:00', '12:00'), (3, '14:30', '18:30'),
  (4, '09:00', '12:00'), (4, '14:30', '18:30'),
  (5, '09:00', '12:00'), (5, '14:30', '18:30'),
  (6, '09:00', '13:00');

insert into public.services (name, description, price_cents, sort_order) values
  ('Manicure simples', 'Cuidado das unhas e cutículas, com verniz.', 1500, 1),
  ('Manicure gel', 'Verniz gel de longa duração.', 2500, 2),
  ('Unhas de gel', 'Construção em gel com acabamento à escolha.', 3500, 3);
