# Top Bolsa App

React Native app (Expo + TypeScript) that shows top gainers for:
- US market (Alpha Vantage)
- Argentina BYMA market (Yahoo Finance via Supabase Edge Function)

## Features

- Market switch: `US` and `AR (BYMA)`
- Timeframe filters: `1D`, `1W`, `1M`, `YTD`
- Top 10 ranking by percentage change
- Sparkline chart per ticker
- Supabase-backed cache for Argentina to reduce Yahoo rate-limit exposure

## Data Flow

US (`fetchUSMarketGainers`)
- Source: Alpha Vantage (`TOP_GAINERS_LOSERS`)
- Fallback: local mock data

Argentina (`fetchARMarketGainers`)
- 1st attempt: Supabase Edge Function `fetch-argentina-market`
- Edge Function source: `yahoo-finance2` using BYMA symbols with `.BA` suffix
- Cache write/read table: `public.argentina_market_cache`
- App fallback chain: edge function -> cache table -> local mock

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

5. Deploy BYMA function
```bash
supabase functions deploy fetch-argentina-market
```

6. Configure cache TTL (optional)
```bash
supabase secrets set ARGENTINA_CACHE_TTL_SECONDS=300
```

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
- Cache schema: `supabase/argentina_market_cache_schema.sql`
- Migration (applied): `supabase/migrations/20260225014841_argentina_market_cache.sql`
