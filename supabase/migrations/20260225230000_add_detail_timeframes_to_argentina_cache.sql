-- Add detail timeframes (3M, 6M, 1Y) to Argentina market cache constraint

do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.argentina_market_cache'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%timeframe%'
  loop
    execute format('alter table public.argentina_market_cache drop constraint if exists %I', v_constraint.conname);
  end loop;
end;
$$;

alter table public.argentina_market_cache
  add constraint argentina_market_cache_timeframe_check
  check (timeframe in ('1H', '1D', '1W', '1M', '3M', '6M', '1Y', 'YTD'));
