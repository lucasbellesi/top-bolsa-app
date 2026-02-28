import YahooFinance from "npm:yahoo-finance2@3.13.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

type TimeframeType = "1H" | "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "YTD";

interface SparklinePoint {
  timestamp: number;
  value: number;
}

interface StockData {
  id: string;
  ticker: string;
  companyName?: string;
  market: "AR";
  price: number;
  percentChange: number;
  sparkline: SparklinePoint[];
}

interface ArgentinaCacheRow {
  ticker: string;
  timeframe: TimeframeType;
  market: "AR";
  company_name: string | null;
  price: number;
  percent_change: number;
  sparkline: SparklinePoint[] | null;
  cached_at: string;
}

interface TickerFetchTrace {
  ticker: string;
  ok: boolean;
  durationMs: number;
  reason?: string;
}

interface TickerFetchResult {
  stock: StockData | null;
  trace: TickerFetchTrace;
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

const VALID_TIMEFRAMES: ReadonlySet<TimeframeType> = new Set(["1H", "1D", "1W", "1M", "3M", "6M", "1Y", "YTD"]);
const CACHE_TTL_SECONDS = Number(Deno.env.get("ARGENTINA_CACHE_TTL_SECONDS") ?? "300");

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured.");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

const average = (values: number[]): number =>
  values.length === 0 ? 0 : Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));

const toErrorDetails = (error: unknown): Record<string, unknown> => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack?.split("\n").slice(0, 3).join(" | "),
    };
  }

  return { message: String(error) };
};

const logEvent = (
  level: "INFO" | "WARN" | "ERROR",
  event: string,
  details: Record<string, unknown>,
): void => {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...details,
  };

  const serialized = JSON.stringify(payload);
  if (level === "ERROR") {
    console.error(serialized);
    return;
  }

  if (level === "WARN") {
    console.warn(serialized);
    return;
  }

  console.log(serialized);
};

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

const parseTicker = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
};

const isSupportedTicker = (ticker: string): boolean =>
  BYMA_TICKERS.includes(ticker as (typeof BYMA_TICKERS)[number]);

const timeframeToStartDate = (timeframe: TimeframeType): Date => {
  const now = new Date();

  switch (timeframe) {
    case "1H": {
      const d = new Date(now);
      d.setDate(d.getDate() - 5);
      return d;
    }
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
      d.setMonth(d.getMonth() - 1);
      return d;
    }
    case "3M": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return d;
    }
    case "6M": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      return d;
    }
    case "1Y": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return d;
    }
    case "YTD":
      return new Date(now.getFullYear(), 0, 1);
  }
};

const timeframeToInterval = (timeframe: TimeframeType): "5m" | "1d" | "1wk" => {
  if (timeframe === "1H") {
    return "5m";
  }

  return timeframe === "YTD" || timeframe === "1Y" ? "1wk" : "1d";
};

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

const computePercentFromOneHourWindow = (
  historicalRows: Array<{ close?: number; date?: Date }>,
  currentPrice: number,
): number => {
  const points = historicalRows
    .filter((row) => row.date instanceof Date && isFiniteNumber(row.close) && row.close > 0)
    .map((row) => ({ ts: (row.date as Date).getTime(), close: row.close as number }))
    .sort((a, b) => a.ts - b.ts);

  if (points.length === 0) {
    return 0;
  }

  const latestTs = points[points.length - 1].ts;
  const oneHourAgoTs = latestTs - 60 * 60 * 1000;
  const baseline =
    [...points].reverse().find((point) => point.ts <= oneHourAgoTs) ?? points[0];

  if (!isFiniteNumber(baseline.close) || baseline.close <= 0) {
    return 0;
  }

  return ((currentPrice - baseline.close) / baseline.close) * 100;
};

const mapCacheRowsToStocks = (rows: ArgentinaCacheRow[], maxRows: number = 10): StockData[] =>
  rows
    .map((row) => ({
      id: row.ticker,
      ticker: row.ticker,
      companyName: row.company_name ?? row.ticker,
      market: "AR" as const,
      price: Number(row.price),
      percentChange: Number(row.percent_change),
      sparkline: Array.isArray(row.sparkline) ? row.sparkline : [],
    }))
    .filter((row) => Number.isFinite(row.price) && Number.isFinite(row.percentChange))
    .sort((a, b) => b.percentChange - a.percentChange)
    .slice(0, maxRows);

const readCache = async (timeframe: TimeframeType, ticker: string | null): Promise<ArgentinaCacheRow[]> => {
  let query = supabase
    .from("argentina_market_cache")
    .select("ticker,timeframe,market,company_name,price,percent_change,sparkline,cached_at")
    .eq("timeframe", timeframe)
    .order("percent_change", { ascending: false });

  if (ticker) {
    query = query.eq("ticker", ticker).limit(1);
  } else {
    query = query.limit(10);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Cache read error", error);
    return [];
  }

  return (data ?? []) as ArgentinaCacheRow[];
};

const isFreshCache = (rows: ArgentinaCacheRow[], minRows: number): boolean => {
  if (rows.length < minRows) {
    return false;
  }

  const nowMs = Date.now();
  const ttlMs = CACHE_TTL_SECONDS * 1000;

  return rows.every((row) => {
    const cachedAt = new Date(row.cached_at).getTime();
    return Number.isFinite(cachedAt) && nowMs - cachedAt <= ttlMs;
  });
};

const fetchTicker = async (ticker: string, timeframe: TimeframeType): Promise<TickerFetchResult> => {
  const yahooTicker = `${ticker}.BA`;
  const startedAt = Date.now();

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
      return {
        stock: null,
        trace: {
          ticker,
          ok: false,
          durationMs: Date.now() - startedAt,
          reason: "missing_price_candidate",
        },
      };
    }

    let historical: Array<{ close?: number; date?: Date }> = [];
    try {
      historical = await yahooFinance.historical(yahooTicker, {
        period1: timeframeToStartDate(timeframe),
        period2: new Date(),
        interval: timeframeToInterval(timeframe),
      });
    } catch (error) {
      logEvent("WARN", "byma_historical_fetch_failed", {
        ticker,
        timeframe,
        ...toErrorDetails(error),
      });
    }

    const sparkline = normalizedSparkline(historical, priceCandidate);
    const companyNameCandidate =
      (typeof quote.longName === "string" && quote.longName.trim().length > 0
        ? quote.longName
        : typeof quote.shortName === "string" && quote.shortName.trim().length > 0
          ? quote.shortName
          : ticker).trim();

    const computedOneHourChange = computePercentFromOneHourWindow(historical, priceCandidate);
    const percentChange = timeframe === "1D" && isFiniteNumber(quote.regularMarketChangePercent)
      ? quote.regularMarketChangePercent
      : timeframe === "1H"
      ? (historical.length > 0 ? computedOneHourChange : isFiniteNumber(quote.regularMarketChangePercent) ? quote.regularMarketChangePercent : 0)
      : (historical.length > 0 ? computePercentFromHistory(historical, priceCandidate) : isFiniteNumber(quote.regularMarketChangePercent) ? quote.regularMarketChangePercent : 0);

    return {
      stock: {
        id: ticker,
        ticker,
        companyName: companyNameCandidate,
        market: "AR",
        price: priceCandidate,
        percentChange,
        sparkline,
      },
      trace: {
        ticker,
        ok: true,
        durationMs: Date.now() - startedAt,
      },
    };
  } catch (error) {
    return {
      stock: null,
      trace: {
        ticker,
        ok: false,
        durationMs: Date.now() - startedAt,
        reason: toErrorDetails(error).message as string,
      },
    };
  }
};

const fetchLiveStocks = async (
  timeframe: TimeframeType,
  tickers: readonly string[],
): Promise<{ stocks: StockData[]; traces: TickerFetchTrace[] }> => {
  const results = await Promise.all(tickers.map((ticker) => fetchTicker(ticker, timeframe)));

  const stocks = results
    .map((result) => result.stock)
    .filter((stock): stock is StockData => stock !== null)
    .sort((a, b) => b.percentChange - a.percentChange)
    .slice(0, tickers.length === 1 ? 1 : 10);

  return {
    stocks,
    traces: results.map((result) => result.trace),
  };
};

const upsertCache = async (timeframe: TimeframeType, stocks: StockData[]): Promise<void> => {
  const nowIso = new Date().toISOString();

  const payload = stocks.map((stock) => ({
    ticker: stock.ticker,
    ticker_yahoo: `${stock.ticker}.BA`,
    timeframe,
    market: "AR",
    company_name: stock.companyName ?? stock.ticker,
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
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const requestStartedAt = Date.now();

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    logEvent("WARN", "byma_request_invalid_method", {
      requestId,
      method: req.method,
    });
    return toResponse(405, { error: "Method not allowed" });
  }

  const body = await req.json().catch(() => ({}));
  const timeframe = parseTimeframe((body as Record<string, unknown>).timeframe);
  const requestedTicker = parseTicker((body as Record<string, unknown>).ticker);
  if (requestedTicker && !isSupportedTicker(requestedTicker)) {
    logEvent("WARN", "byma_request_invalid_ticker", {
      requestId,
      timeframe,
      ticker: requestedTicker,
    });
    return toResponse(400, { error: `Unsupported ticker: ${requestedTicker}` });
  }
  const requestedTickers = requestedTicker ? [requestedTicker] : [...BYMA_TICKERS];
  logEvent("INFO", "byma_request_started", {
    requestId,
    timeframe,
    ticker: requestedTicker,
    cacheTtlSeconds: CACHE_TTL_SECONDS,
  });

  const cacheReadStartedAt = Date.now();
  const cachedRows = await readCache(timeframe, requestedTicker);
  const cacheReadMs = Date.now() - cacheReadStartedAt;
  const freshCache = isFreshCache(cachedRows, requestedTicker ? 1 : 5);
  logEvent("INFO", "byma_cache_read", {
    requestId,
    timeframe,
    ticker: requestedTicker,
    cacheRows: cachedRows.length,
    cacheReadMs,
    freshCache,
  });

  if (freshCache) {
    logEvent("INFO", "byma_request_completed", {
      requestId,
      timeframe,
      ticker: requestedTicker,
      source: "cache",
      durationMs: Date.now() - requestStartedAt,
    });
    return toResponse(200, {
      source: "cache",
      timeframe,
      stocks: mapCacheRowsToStocks(cachedRows, requestedTicker ? 1 : 10),
      requestId,
    });
  }

  try {
    const liveFetchStartedAt = Date.now();
    const { stocks: liveStocks, traces } = await fetchLiveStocks(timeframe, requestedTickers);
    const liveFetchMs = Date.now() - liveFetchStartedAt;

    const failedTraces = traces.filter((trace) => !trace.ok);
    logEvent("INFO", "byma_live_fetch_summary", {
      requestId,
      timeframe,
      requestedTickers: requestedTickers.length,
      successCount: traces.length - failedTraces.length,
      failureCount: failedTraces.length,
      avgTickerDurationMs: average(traces.map((trace) => trace.durationMs)),
      liveFetchMs,
      failedTickers: failedTraces.map((trace) => ({
        ticker: trace.ticker,
        reason: trace.reason ?? "unknown",
      })),
    });

    if (liveStocks.length === 0) {
      throw new Error("Yahoo returned no BYMA rows.");
    }

    const upsertStartedAt = Date.now();
    await upsertCache(timeframe, liveStocks);
    const upsertMs = Date.now() - upsertStartedAt;
    logEvent("INFO", "byma_cache_upsert_completed", {
      requestId,
      timeframe,
      ticker: requestedTicker,
      upsertedRows: liveStocks.length,
      upsertMs,
    });

    logEvent("INFO", "byma_request_completed", {
      requestId,
      timeframe,
      ticker: requestedTicker,
      source: "live",
      durationMs: Date.now() - requestStartedAt,
      returnedRows: liveStocks.length,
    });

    return toResponse(200, {
      source: "live",
      timeframe,
      stocks: liveStocks,
      requestId,
    });
  } catch (error) {
    logEvent("ERROR", "byma_live_fetch_failed", {
      requestId,
      timeframe,
      ticker: requestedTicker,
      cacheRows: cachedRows.length,
      error: toErrorDetails(error),
    });

    if (cachedRows.length > 0) {
      logEvent("WARN", "byma_cache_fallback_used", {
        requestId,
        timeframe,
        ticker: requestedTicker,
        source: "cache_fallback",
        durationMs: Date.now() - requestStartedAt,
      });
      return toResponse(200, {
        source: "cache_fallback",
        stale: true,
        timeframe,
        stocks: mapCacheRowsToStocks(cachedRows, requestedTicker ? 1 : 10),
        requestId,
      });
    }

    logEvent("ERROR", "byma_request_failed_no_cache", {
      requestId,
      timeframe,
      ticker: requestedTicker,
      durationMs: Date.now() - requestStartedAt,
    });
    return toResponse(502, {
      error: "Unable to fetch Argentina market data and no cache is available.",
      requestId,
    });
  }
});
