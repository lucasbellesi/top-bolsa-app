alter table public.argentina_company_profile_cache enable row level security;

drop policy if exists "Public read argentina company profile cache" on public.argentina_company_profile_cache;
create policy "Public read argentina company profile cache"
  on public.argentina_company_profile_cache
  for select
  to anon, authenticated
  using (true);
