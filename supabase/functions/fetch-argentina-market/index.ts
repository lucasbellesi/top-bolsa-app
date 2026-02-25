import YahooFinance from "npm:yahoo-finance2@3.13.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

type TimeframeType = "1D" | "1W" | "1M" | "YTD";

interface SparklinePoint {
  timestamp: number;
  value: number;
}

interface StockData {
  id: string;
  ticker: string;
  market: "AR";
  price: number;
  percentChange: number;
  sparkline: SparklinePoint[];
}

interface ArgentinaCacheRow {
  ticker: string;
  timeframe: TimeframeType;
  market: "AR";
  price: number;
  percent_change: number;
  sparkline: SparklinePoint[] | null;
  cached_at: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const yahooFinance = new YahooFinance();

const BYMA_TICKERS = [
  "GGAL",
  "YPFD",
  "PAMP",
  "TXAR",
  "LOMA",
  "CEPU",
  "EDN",
  "CRES",
  "SUPV",
  "BMA",
] as const;

const VALID_TIMEFRAMES: ReadonlySet<TimeframeType> = new Set(["1D", "1W", "1M", "YTD"]);
const CACHE_TTL_SECONDS = Number(Deno.env.get("ARGENTINA_CACHE_TTL_SECONDS") ?? "300");

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured.");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

const toResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const parseTimeframe = (value: unknown): TimeframeType => {
  if (typeof value === "string" && VALID_TIMEFRAMES.has(value as TimeframeType)) {
    return value as TimeframeType;
  }

  return "1D";
};

const timeframeToStartDate = (timeframe: TimeframeType): Date => {
  const now = new Date();

  switch (timeframe) {
    case "1D": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d;
    }
    case "1W": {
      const d = new Date(now);
      d.setDate(d.getDate() - 21);
      return d;
    }
    case "1M": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return d;
    }
    case "YTD":
      return new Date(now.getFullYear(), 0, 1);
  }
};

const timeframeToInterval = (timeframe: TimeframeType): "1d" | "1wk" =>
  timeframe === "YTD" ? "1wk" : "1d";

const normalizedSparkline = (
  historicalRows: Array<{ date?: Date; close?: number }>,
  fallbackPrice: number,
): SparklinePoint[] => {
  const points = historicalRows
    .filter((row) => row.date instanceof Date && isFiniteNumber(row.close))
    .map((row) => ({
      timestamp: (row.date as Date).getTime(),
      value: row.close as number,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  if (points.length > 0) {
    return points;
  }

  return [{ timestamp: Date.now(), value: fallbackPrice }];
};

const computePercentFromHistory = (
  historicalRows: Array<{ close?: number; date?: Date }>,
  currentPrice: number,
): number => {
  const firstValid = historicalRows
    .filter((row) => isFiniteNumber(row.close) && row.close > 0)
    .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0))[0];

  if (!firstValid || !isFiniteNumber(firstValid.close) || firstValid.close <= 0) {
    return 0;
  }

  return ((currentPrice - firstValid.close) / firstValid.close) * 100;
};

const mapCacheRowsToStocks = (rows: ArgentinaCacheRow[]): StockData[] =>
  rows
    .map((row) => ({
      id: row.ticker,
      ticker: row.ticker,
      market: "AR" as const,
      price: Number(row.price),
      percentChange: Number(row.percent_change),
      sparkline: Array.isArray(row.sparkline) ? row.sparkline : [],
    }))
    .filter((row) => Number.isFinite(row.price) && Number.isFinite(row.percentChange))
    .sort((a, b) => b.percentChange - a.percentChange)
    .slice(0, 10);

const readCache = async (timeframe: TimeframeType): Promise<ArgentinaCacheRow[]> => {
  const { data, error } = await supabase
    .from("argentina_market_cache")
    .select("ticker,timeframe,market,price,percent_change,sparkline,cached_at")
    .eq("timeframe", timeframe)
    .order("percent_change", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Cache read error", error);
    return [];
  }

  return (data ?? []) as ArgentinaCacheRow[];
};

const isFreshCache = (rows: ArgentinaCacheRow[]): boolean => {
  if (rows.length < 5) {
    return false;
  }

  const nowMs = Date.now();
  const ttlMs = CACHE_TTL_SECONDS * 1000;

  return rows.every((row) => {
    const cachedAt = new Date(row.cached_at).getTime();
    return Number.isFinite(cachedAt) && nowMs - cachedAt <= ttlMs;
  });
};

const fetchTicker = async (ticker: string, timeframe: TimeframeType): Promise<StockData | null> => {
  const yahooTicker = `${ticker}.BA`;

  try {
    const quote = await yahooFinance.quote(yahooTicker);

    const priceCandidate = [
      quote.regularMarketPrice,
      quote.postMarketPrice,
      quote.preMarketPrice,
      quote.bid,
      quote.ask,
    ].find((value) => isFiniteNumber(value));

    if (!isFiniteNumber(priceCandidate)) {
      return null;
    }

    const historical = await yahooFinance.historical(yahooTicker, {
      period1: timeframeToStartDate(timeframe),
      period2: new Date(),
      interval: timeframeToInterval(timeframe),
    });

    const sparkline = normalizedSparkline(historical, priceCandidate);

    const percentChange = timeframe === "1D" && isFiniteNumber(quote.regularMarketChangePercent)
      ? quote.regularMarketChangePercent
      : computePercentFromHistory(historical, priceCandidate);

    return {
      id: ticker,
      ticker,
      market: "AR",
      price: priceCandidate,
      percentChange,
      sparkline,
    };
  } catch (error) {
    console.error(`Yahoo fetch failed for ${yahooTicker}`, error);
    return null;
  }
};

const fetchLiveStocks = async (timeframe: TimeframeType): Promise<StockData[]> => {
  const results = await Promise.all(BYMA_TICKERS.map((ticker) => fetchTicker(ticker, timeframe)));

  return results
    .filter((stock): stock is StockData => stock !== null)
    .sort((a, b) => b.percentChange - a.percentChange)
    .slice(0, 10);
};

const upsertCache = async (timeframe: TimeframeType, stocks: StockData[]): Promise<void> => {
  const nowIso = new Date().toISOString();

  const payload = stocks.map((stock) => ({
    ticker: stock.ticker,
    ticker_yahoo: `${stock.ticker}.BA`,
    timeframe,
    market: "AR",
    price: stock.price,
    percent_change: stock.percentChange,
    sparkline: stock.sparkline,
    source: "yahoo-finance2",
    cached_at: nowIso,
    updated_at: nowIso,
  }));

  if (payload.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("argentina_market_cache")
    .upsert(payload, { onConflict: "ticker,timeframe" });

  if (error) {
    console.error("Cache upsert error", error);
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return toResponse(405, { error: "Method not allowed" });
  }

  const body = await req.json().catch(() => ({}));
  const timeframe = parseTimeframe((body as Record<string, unknown>).timeframe);

  const cachedRows = await readCache(timeframe);
  if (isFreshCache(cachedRows)) {
    return toResponse(200, {
      source: "cache",
      timeframe,
      stocks: mapCacheRowsToStocks(cachedRows),
    });
  }

  try {
    const liveStocks = await fetchLiveStocks(timeframe);

    if (liveStocks.length === 0) {
      throw new Error("Yahoo returned no BYMA rows.");
    }

    await upsertCache(timeframe, liveStocks);

    return toResponse(200, {
      source: "live",
      timeframe,
      stocks: liveStocks,
    });
  } catch (error) {
    console.error("Live fetch failed. Falling back to cache.", error);

    if (cachedRows.length > 0) {
      return toResponse(200, {
        source: "cache_fallback",
        stale: true,
        timeframe,
        stocks: mapCacheRowsToStocks(cachedRows),
      });
    }

    return toResponse(502, {
      error: "Unable to fetch Argentina market data and no cache is available.",
    });
  }
});
