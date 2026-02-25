# Top 10 Stock Gainers App

A real-time dual-market Android App built with Expo, React Native, and Supabase. The app allows users to seamlessly switch between the Wall Street (NYSE/NASDAQ) and Argentina (BYMA) markets to track the top 10 daily, weekly, monthly, and yearly stock gainers.

## ✨ Features

- **Dual Market Tracking**: Switch between US (NYSE/NASDAQ) and AR (BYMA) markets in real-time.
- **Dynamic Timeframes**: Filter the top gainers by `1D`, `1W`, `1M`, or `YTD`.
- **Rankings**: Automatically sorts the top 10 tickers by highest percentage change.
- **Sparkline Charts**: Visualizes stock momentum via `react-native-wagmi-charts` for each ticker.
- **High-Contrast Dark Mode**: Premium UI designed using NativeWind v4 with tailored readability for numerical financial data.

## 🛠 Tech Stack

- **Framework**: Expo (React Native managed workflow) with TypeScript.
- **Styling**: NativeWind (Tailwind CSS v3) + Lucide React Native icons.
- **State Management**: `@tanstack/react-query` for high-performance API caching and fetching.
- **Database / Backend**: Supabase (Edge Functions + cache tables with RLS enabled).
- **APIs**: Alpha Vantage (US Market), Yahoo Finance via `yahoo-finance2` (BYMA with `.BA` suffix).

---

## 🚀 Getting Started

To run this project locally, ensure you have Node.js and npm/yarn installed.

### 1. Clone the repository
```bash
git clone https://github.com/lucasbellesi/top-bolsa-app.git
cd top-bolsa-app
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file at the root of the project and add your appropriate API keys according to `env.d.ts` and Supabase configuration.
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_STOCK_API_KEY=your_alphavantage_key
```

### 4. Run the App
Start the Expo development server:
```bash
npx expo start
```
You can now open the app on your physical device using the Expo Go app or an Android emulator/iOS simulator by pressing `a` or `i` in the terminal.

---

## 🗄 Supabase Setup

1. Run the SQL schema files in Supabase SQL Editor:
   - `supabase/stock_cache_schema.sql`
   - `supabase/argentina_market_cache_schema.sql`

2. Deploy the Edge Function that fetches BYMA quotes through `yahoo-finance2`:
```bash
supabase functions deploy fetch-argentina-market
```

3. Set function secrets (Dashboard or CLI):
```bash
supabase secrets set ARGENTINA_CACHE_TTL_SECONDS=300
```

The function first attempts live Yahoo (`*.BA`) quotes and historical data, persists them to `argentina_market_cache`, and falls back to cached rows when Yahoo fails or rate-limits.
