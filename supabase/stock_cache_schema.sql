-- Create the stock_cache table
create table public.stock_cache (
  id uuid default gen_random_uuid() primary key,
  ticker text not null,
  market text not null, -- 'US' or 'AR'
  price numeric not null,
  percent_change numeric not null,
  timeframe text not null, -- '1D', '1W', '1M', 'YTD'
  updated_at timestamp with time zone default now()
);

-- Index for fast retrieval based on market and timeframe
create index idx_stock_cache_market_timeframe on public.stock_cache(market, timeframe);

-- Enable Row Level Security (RLS)
alter table public.stock_cache enable row level security;

-- Create policy to allow read access for all users
create policy "Allow read access for all users"
  on public.stock_cache
  for select
  to public
  using (true);
