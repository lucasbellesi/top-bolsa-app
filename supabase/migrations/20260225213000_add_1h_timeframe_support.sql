-- Add 1H timeframe support for Argentina market cache and warm-up scheduler

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
  check (timeframe in ('1H', '1D', '1W', '1M', 'YTD'));

create or replace function public.warm_argentina_market_cache()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_project_url text;
  v_anon_key text;
  v_headers jsonb;
begin
  select value into v_project_url
  from public.internal_scheduler_config
  where key = 'supabase_project_url';

  select value into v_anon_key
  from public.internal_scheduler_config
  where key = 'supabase_anon_key';

  if coalesce(v_project_url, '') = ''
    or coalesce(v_anon_key, '') = ''
    or v_project_url = 'https://YOUR_PROJECT_REF.supabase.co'
    or v_anon_key = 'YOUR_SUPABASE_ANON_KEY' then
    raise warning 'Warm-up skipped: missing scheduler config values.';
    return;
  end if;

  v_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || v_anon_key,
    'apikey', v_anon_key
  );

  perform net.http_post(
    url := v_project_url || '/functions/v1/fetch-argentina-market',
    headers := v_headers,
    body := jsonb_build_object('timeframe', '1H')
  );

  perform net.http_post(
    url := v_project_url || '/functions/v1/fetch-argentina-market',
    headers := v_headers,
    body := jsonb_build_object('timeframe', '1D')
  );

  perform net.http_post(
    url := v_project_url || '/functions/v1/fetch-argentina-market',
    headers := v_headers,
    body := jsonb_build_object('timeframe', '1W')
  );

  perform net.http_post(
    url := v_project_url || '/functions/v1/fetch-argentina-market',
    headers := v_headers,
    body := jsonb_build_object('timeframe', '1M')
  );

  perform net.http_post(
    url := v_project_url || '/functions/v1/fetch-argentina-market',
    headers := v_headers,
    body := jsonb_build_object('timeframe', 'YTD')
  );
end;
$$;

-- Prime 1H cache immediately after migration.
select public.warm_argentina_market_cache();
