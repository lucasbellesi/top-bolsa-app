-- Schedule warm-up job for Argentina market cache via Edge Function
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

create table if not exists public.internal_scheduler_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.internal_scheduler_config enable row level security;

insert into public.internal_scheduler_config (key, value)
values
  ('supabase_project_url', 'https://YOUR_PROJECT_REF.supabase.co'),
  ('supabase_anon_key', 'YOUR_SUPABASE_ANON_KEY')
on conflict (key)
do update set value = excluded.value, updated_at = now();

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

do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid
    from cron.job
    where jobname = 'warm-argentina-market-cache'
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'warm-argentina-market-cache',
    '*/5 * * * *',
    $cron$select public.warm_argentina_market_cache();$cron$
  );
end;
$$;

-- Prime cache once right away.
select public.warm_argentina_market_cache();
