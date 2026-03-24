# Top Bolsa App

React Native app (Expo + TypeScript) that shows top gainers for:

- US market (Alpha Vantage)
- Argentina BYMA market (Yahoo Finance via Supabase Edge Function)

## Features

- Market switch: `US` and `AR (BYMA)`
- Timeframe filters: `1H`, `1D`, `1W`, `1M`, `3M`, `YTD`
- Currency switch: `ARS` or `USD`
- Theme switch: `dark` or `light` (persisted)
- Top 10 ranking by percentage change
- Sparkline chart per ticker
- Tap any stock to open a dedicated detail screen
- Data freshness messaging (live/cache/delayed) and non-blocking update indicators
- Skeleton loading states for Home and Detail screens
- Supabase-backed cache for Argentina to reduce Yahoo rate-limit exposure
- Production-safe fallback: no simulated prices when live/cache data is unavailable

## Data Flow

US (`fetchUSMarketGainers`)

- Source: Alpha Vantage (`TOP_GAINERS_LOSERS`)
- Fallback chain: ranked cache -> (dev/opt-in) local mock -> `UNAVAILABLE`

Argentina (`fetchARMarketGainers`)

- 1st attempt: Supabase Edge Function `fetch-argentina-market`
- Edge Function source: `yahoo-finance2` using BYMA symbols with `.BA` suffix
- Cache write/read table: `public.argentina_market_cache`
- App fallback chain: edge function -> cache table -> (dev/opt-in) local mock -> `UNAVAILABLE`

Argentina company profile (`fetchCompanyProfile` for `AR`)

- 1st attempt: Supabase Edge Function `fetch-argentina-company-profile`
- Cache write/read table: `public.argentina_company_profile_cache`
- App fallback chain: edge function -> in-memory cache/minimal profile

## Stack

- Expo SDK 54 / React Native 0.81 / React 19
- TypeScript + React Query
- NativeWind + wagmi charts
- Supabase (database + edge functions)

## Prerequisites

- Node.js 18+
- Android Studio + emulator (for Android run)
- Supabase CLI (`npm i -g supabase` or `npx supabase ...`)
- Supabase project

## Setup

1. Clone and install

```bash
git clone https://github.com/lucasbellesi/top-bolsa-app.git
cd top-bolsa-app
npm install
```

2. Create `.env`

```env
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
EXPO_PUBLIC_STOCK_API_KEY=<your-alphavantage-key>
# Optional: enable mock fallback outside dev (default false)
EXPO_PUBLIC_ALLOW_MOCK_FALLBACK=false
```

3. Link Supabase project

```bash
supabase login
supabase link --project-ref <your-project-ref>
```

4. Apply database schema

```bash
supabase db push --include-all
```

5. Deploy Supabase Edge Functions

```bash
supabase functions deploy fetch-argentina-market
supabase functions deploy fetch-argentina-company-profile
```

6. Configure cache TTLs (optional)

```bash
supabase secrets set ARGENTINA_CACHE_TTL_SECONDS=300
supabase secrets set ARGENTINA_COMPANY_PROFILE_CACHE_TTL_SECONDS=86400
```

7. Configure BYMA warm-up scheduler values (required once)

- Open your Supabase SQL Editor and run:

```sql
update public.internal_scheduler_config
set value = 'https://<your-project-ref>.supabase.co', updated_at = now()
where key = 'supabase_project_url';

update public.internal_scheduler_config
set value = '<your-anon-key>', updated_at = now()
where key = 'supabase_anon_key';

select public.warm_argentina_market_cache();
```

The migration `20260225020407_schedule_argentina_cache_warmup.sql` schedules cron job `warm-argentina-market-cache` every 5 minutes.
The migration `20260225213000_add_1h_timeframe_support.sql` adds `1H` support in cache + warm-up.

## Verification

- Run full local verification:

```bash
npm run verify
```

- Supabase snapshot parity only:

```bash
npm run check:supabase-schema
```

- CI workflow:
    - `.github/workflows/verify.yml` runs `npm run verify` for pull requests to `main` and pushes to `main`

If Supabase env vars are missing, the app runs in degraded mode and logs a `[SUPABASE_DEGRADED_MODE]` warning with missing keys.

## Run

Android (recommended):

```bash
npm run android
```

Other targets:

```bash
npm run ios
npm run web
npm run start
```

## Relevant Files

- App fetch logic: `src/services/api.ts`
- Supabase client: `src/services/supabase.ts`
- Edge function: `supabase/functions/fetch-argentina-market/index.ts`
- Edge function: `supabase/functions/fetch-argentina-company-profile/index.ts`
- Cache schema: `supabase/argentina_market_cache_schema.sql`
- Cache schema: `supabase/argentina_company_profile_cache_schema.sql`
- Migration (applied): `supabase/migrations/20260225014841_argentina_market_cache.sql`
- Migration (applied): `supabase/migrations/20260310185000_harden_argentina_company_profile_cache_rls.sql`
- Privacy policy template: `PRIVACY_POLICY.md`

## Legal & Play Store Checklist

1. Publish a public privacy policy URL (HTTPS) using `PRIVACY_POLICY.md` as base.
2. Complete Google Play Data Safety form using your real SDK/services.
3. Keep financial disclaimer visible in-app and in store listing:
    - "Informational use only. Not investment advice."
4. Verify market data licensing for commercial/ads use before launch.
5. If AdMob is enabled, implement consent flow where required (EEA/UK/CH).
