-- M2: limite de pedidos (IP e telemóvel) no formulário de convidada.
-- A chave é um hash calculado no servidor (sal secreto): nunca se guarda IP nem telemóvel em claro.
-- Os registos expiram com a janela e são apagados por um job horário.

create table private.rate_limits (
  key text not null,
  bucket bigint not null,
  hits integer not null default 0,
  expires_at timestamptz not null,
  primary key (key, bucket)
);

-- true = pedido permitido; false = limite excedido na janela.
create function public.rate_limit_hit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_bucket bigint := floor(extract(epoch from now()) / p_window_seconds);
  v_hits integer;
begin
  insert into private.rate_limits as r (key, bucket, hits, expires_at)
  values (p_key, v_bucket, 1, to_timestamp((v_bucket + 1) * p_window_seconds))
  on conflict (key, bucket) do update set hits = r.hits + 1
  returning r.hits into v_hits;
  return v_hits <= p_limit;
end;
$$;
revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;

create function private.purge_rate_limits() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_n integer;
begin
  delete from private.rate_limits where expires_at < now();
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function private.purge_rate_limits() from public, anon, authenticated;

select cron.schedule('purge-rate-limits', '5 * * * *', 'select private.purge_rate_limits()');
