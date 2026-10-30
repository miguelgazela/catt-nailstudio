begin;
select plan(5);

select is(public.rate_limit_hit('k1', 2, 600), true, '1.º pedido passa');
select is(public.rate_limit_hit('k1', 2, 600), true, '2.º pedido passa');
select is(public.rate_limit_hit('k1', 2, 600), false, '3.º pedido excede o limite');
select is(public.rate_limit_hit('k2', 2, 600), true, 'outra chave tem o seu contador');

-- Só o servidor chama
set local role anon;
select throws_ok($$select public.rate_limit_hit('k3', 1, 60)$$, '42501', null, 'público não chama rate_limit_hit');
reset role;

select * from finish();
rollback;
