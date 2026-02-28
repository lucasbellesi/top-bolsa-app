import YahooFinance from "npm:yahoo-finance2@3.13.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

type DataSourceType = "live" | "cache" | "cache_fallback";

interface CompanyProfileData {
  ticker: string;
  market: "AR";
  companyName: string;
  description?: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  exchange?: string;
  country?: string;
  website?: string;
  lastUpdatedAt: string;
}

interface CacheRow {
  ticker: string;
  ticker_yahoo: string;
  market: "AR";
  company_name: string;
  description: string | null;
  sector: string | null;
  industry: string | null;
  market_cap: number | null;
  exchange: string | null;
  country: string | null;
  website: string | null;
  cached_at: string;
  updated_at: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const yahooFinance = new YahooFinance();
const CACHE_TTL_SECONDS = Number(Deno.env.get("ARGENTINA_COMPANY_PROFILE_CACHE_TTL_SECONDS") ?? "86400");
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured.");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

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

const isSupportedTicker = (ticker: string): boolean =>
  BYMA_TICKERS.includes(ticker as (typeof BYMA_TICKERS)[number]);

const toResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getString = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (isRecord(value) && typeof value.fmt === "string" && value.fmt.trim().length > 0) {
    return value.fmt.trim();
  }

  return undefined;
};

const getNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  if (isRecord(value) && typeof value.raw === "number" && Number.isFinite(value.raw)) {
    return value.raw;
  }

  return undefined;
};

const mapCacheRowToProfile = (row: CacheRow): CompanyProfileData => ({
  ticker: row.ticker,
  market: "AR",
  companyName: row.company_name,
  description: row.description ?? undefined,
  sector: row.sector ?? undefined,
  industry: row.industry ?? undefined,
  marketCap: row.market_cap ?? undefined,
  exchange: row.exchange ?? undefined,
  country: row.country ?? undefined,
  website: row.website ?? undefined,
  lastUpdatedAt: row.updated_at,
});

const isFreshCache = (row: CacheRow | null): boolean => {
  if (!row) {
    return false;
  }

  const cachedAt = new Date(row.cached_at).getTime();
  return Number.isFinite(cachedAt) && Date.now() - cachedAt <= CACHE_TTL_SECONDS * 1000;
};

const readCache = async (ticker: string): Promise<CacheRow | null> => {
  const { data, error } = await supabase
    .from("argentina_company_profile_cache")
    .select("ticker,ticker_yahoo,market,company_name,description,sector,industry,market_cap,exchange,country,website,cached_at,updated_at")
    .eq("ticker", ticker)
    .maybeSingle();

  if (error) {
    console.error("Argentina company profile cache read failed", error);
    return null;
  }

  return (data as CacheRow | null) ?? null;
};

const upsertCache = async (profile: CompanyProfileData): Promise<void> => {
  const nowIso = new Date().toISOString();
  const payload = {
    ticker: profile.ticker,
    ticker_yahoo: `${profile.ticker}.BA`,
    market: "AR",
    company_name: profile.companyName,
    description: profile.description ?? null,
    sector: profile.sector ?? null,
    industry: profile.industry ?? null,
    market_cap: profile.marketCap ?? null,
    exchange: profile.exchange ?? null,
    country: profile.country ?? null,
    website: profile.website ?? null,
    source: "yahoo-finance2",
    cached_at: nowIso,
    updated_at: nowIso,
  };

  const { error } = await supabase
    .from("argentina_company_profile_cache")
    .upsert(payload, { onConflict: "ticker" });

  if (error) {
    console.error("Argentina company profile cache upsert failed", error);
  }
};

const buildProfileFromQuoteSummary = async (ticker: string): Promise<CompanyProfileData> => {
  const yahooTicker = `${ticker}.BA`;
  const summary = await yahooFinance.quoteSummary(yahooTicker, {
    modules: ["price", "assetProfile", "summaryDetail", "defaultKeyStatistics"],
  }) as Record<string, unknown>;

  const price = isRecord(summary.price) ? summary.price : {};
  const assetProfile = isRecord(summary.assetProfile) ? summary.assetProfile : {};
  const summaryDetail = isRecord(summary.summaryDetail) ? summary.summaryDetail : {};
  const defaultKeyStatistics = isRecord(summary.defaultKeyStatistics) ? summary.defaultKeyStatistics : {};

  const companyName =
    getString(price.longName) ||
    getString(price.shortName) ||
    ticker;

  const profile: CompanyProfileData = {
    ticker,
    market: "AR",
    companyName,
    description: getString(assetProfile.longBusinessSummary),
    sector: getString(assetProfile.sector),
    industry: getString(assetProfile.industry),
    marketCap: getNumber(summaryDetail.marketCap) ?? getNumber(defaultKeyStatistics.marketCap),
    exchange: getString(price.exchangeName) || getString(price.fullExchangeName),
    country: getString(assetProfile.country),
    website: getString(assetProfile.website),
    lastUpdatedAt: new Date().toISOString(),
  };

  return profile;
};

const buildFallbackProfileFromQuote = async (ticker: string): Promise<CompanyProfileData> => {
  const yahooTicker = `${ticker}.BA`;
  const quote = await yahooFinance.quote(yahooTicker);

  const companyName =
    (typeof quote.longName === "string" && quote.longName.trim().length > 0
      ? quote.longName.trim()
      : typeof quote.shortName === "string" && quote.shortName.trim().length > 0
        ? quote.shortName.trim()
        : ticker);

  return {
    ticker,
    market: "AR",
    companyName,
    marketCap: getNumber((quote as unknown as Record<string, unknown>).marketCap),
    exchange: typeof quote.exchange === "string" && quote.exchange.trim().length > 0
      ? quote.exchange.trim()
      : undefined,
    lastUpdatedAt: new Date().toISOString(),
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return toResponse(405, { error: "Method not allowed" });
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const ticker = typeof body.ticker === "string" ? body.ticker.trim().toUpperCase() : "";

  if (!ticker || !isSupportedTicker(ticker)) {
    return toResponse(400, { error: `Unsupported ticker: ${ticker || "unknown"}` });
  }

  const cached = await readCache(ticker);
  if (isFreshCache(cached)) {
    return toResponse(200, {
      source: "cache" satisfies DataSourceType,
      profile: mapCacheRowToProfile(cached as CacheRow),
    });
  }

  try {
    let profile: CompanyProfileData;

    try {
      profile = await buildProfileFromQuoteSummary(ticker);
    } catch (error) {
      console.warn("Argentina company profile quoteSummary failed", error);
      profile = await buildFallbackProfileFromQuote(ticker);
    }

    await upsertCache(profile);

    return toResponse(200, {
      source: "live" satisfies DataSourceType,
      profile,
    });
  } catch (error) {
    console.error("Argentina company profile fetch failed", error);

    if (cached) {
      return toResponse(200, {
        source: "cache_fallback" satisfies DataSourceType,
        profile: mapCacheRowToProfile(cached),
      });
    }

    return toResponse(500, { error: "Company profile unavailable" });
  }
});
