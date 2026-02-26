-- Cache table for BYMA data fetched via yahoo-finance2 in Supabase Edge Functions
create table if not exists public.argentina_market_cache (
  ticker text not null,
  ticker_yahoo text not null,
  timeframe text not null check (timeframe in ('1H', '1D', '1W', '1M', '3M', '6M', '1Y', 'YTD')),
  market text not null default 'AR' check (market = 'AR'),
  company_name text,
  price numeric not null,
  percent_change numeric not null,
  sparkline jsonb not null default '[]'::jsonb,
  source text not null default 'yahoo-finance2',
  cached_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (ticker, timeframe)
);

create index if not exists idx_argentina_market_cache_timeframe_change
  on public.argentina_market_cache (timeframe, percent_change desc);

create index if not exists idx_argentina_market_cache_cached_at
  on public.argentina_market_cache (cached_at desc);

create or replace function public.set_argentina_market_cache_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_argentina_market_cache_updated_at on public.argentina_market_cache;
create trigger trg_argentina_market_cache_updated_at
before update on public.argentina_market_cache
for each row execute function public.set_argentina_market_cache_updated_at();

alter table public.argentina_market_cache enable row level security;

drop policy if exists "Public read argentina market cache" on public.argentina_market_cache;
create policy "Public read argentina market cache"
  on public.argentina_market_cache
  for select
  to anon, authenticated
  using (true);
