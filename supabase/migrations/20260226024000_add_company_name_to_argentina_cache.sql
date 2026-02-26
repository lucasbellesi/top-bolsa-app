alter table public.argentina_market_cache
  add column if not exists company_name text;
