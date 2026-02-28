create table if not exists public.argentina_company_profile_cache (
  ticker text primary key,
  ticker_yahoo text not null,
  market text not null default 'AR',
  company_name text not null,
  description text null,
  sector text null,
  industry text null,
  market_cap numeric null,
  exchange text null,
  country text null,
  website text null,
  source text not null default 'yahoo-finance2',
  cached_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
