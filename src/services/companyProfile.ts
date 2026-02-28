import { CompanyProfileData, DataSourceType, MarketType } from '../types';
import { supabase } from './supabase';

const ALPHAVANTAGE_KEY = process.env.EXPO_PUBLIC_STOCK_API_KEY || 'demo';
const COMPANY_PROFILE_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

interface CompanyProfileResponse {
    source?: string;
    profile?: Partial<CompanyProfileData> | null;
}

const companyProfileCache = new Map<string, { expiresAt: number; data: CompanyProfileData }>();

const getCacheKey = (market: MarketType, ticker: string) => `${market}:${ticker.toUpperCase()}`;

const mapSourceToUiSource = (source?: string): DataSourceType => {
    switch ((source || '').toLowerCase()) {
        case 'live':
            return 'LIVE';
        case 'cache':
        case 'cache_fallback':
            return 'CACHE';
        case 'mock':
            return 'MOCK';
        default:
            return 'UNAVAILABLE';
    }
};

const isAlphaVantageError = (payload: Record<string, unknown>): boolean =>
    Boolean(payload.Note || payload.Information || payload['Error Message']);

const parseNumericValue = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const parsed = Number(value.replace(/,/g, '').trim());
        return Number.isFinite(parsed) ? parsed : undefined;
    }

    return undefined;
};

const getCachedProfile = (market: MarketType, ticker: string): CompanyProfileData | null => {
    const cached = companyProfileCache.get(getCacheKey(market, ticker));
    if (!cached) {
        return null;
    }

    if (cached.expiresAt > Date.now()) {
        return { ...cached.data, source: 'CACHE' };
    }

    return cached.data;
};

const storeCachedProfile = (profile: CompanyProfileData): void => {
    companyProfileCache.set(getCacheKey(profile.market, profile.ticker), {
        data: profile,
        expiresAt: Date.now() + COMPANY_PROFILE_CACHE_TTL_MS,
    });
};

const buildMinimalProfile = (
    ticker: string,
    market: MarketType,
    fallbackCompanyName?: string,
    source: DataSourceType = 'UNAVAILABLE',
): CompanyProfileData => ({
    ticker: ticker.toUpperCase(),
    market,
    companyName: fallbackCompanyName?.trim() || ticker.toUpperCase(),
    source,
    lastUpdatedAt: new Date().toISOString(),
});

const fetchUSCompanyProfile = async (
    ticker: string,
    fallbackCompanyName?: string,
): Promise<CompanyProfileData> => {
    const normalizedTicker = ticker.toUpperCase();
    const freshCached = getCachedProfile('US', normalizedTicker);
    if (freshCached?.source === 'CACHE') {
        return freshCached;
    }

    try {
        const response = await fetch(
            `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${normalizedTicker}&apikey=${ALPHAVANTAGE_KEY}`,
        );
        const payload = await response.json() as Record<string, unknown>;

        if (isAlphaVantageError(payload)) {
            throw new Error('Alpha Vantage overview unavailable');
        }

        const profile: CompanyProfileData = {
            ticker: normalizedTicker,
            market: 'US',
            companyName: typeof payload.Name === 'string' && payload.Name.trim().length > 0
                ? payload.Name.trim()
                : fallbackCompanyName?.trim() || normalizedTicker,
            description: typeof payload.Description === 'string' && payload.Description.trim().length > 0
                ? payload.Description.trim()
                : undefined,
            sector: typeof payload.Sector === 'string' && payload.Sector.trim().length > 0
                ? payload.Sector.trim()
                : undefined,
            industry: typeof payload.Industry === 'string' && payload.Industry.trim().length > 0
                ? payload.Industry.trim()
                : undefined,
            marketCap: parseNumericValue(payload.MarketCapitalization),
            exchange: typeof payload.Exchange === 'string' && payload.Exchange.trim().length > 0
                ? payload.Exchange.trim()
                : undefined,
            country: typeof payload.Country === 'string' && payload.Country.trim().length > 0
                ? payload.Country.trim()
                : undefined,
            source: 'LIVE',
            lastUpdatedAt: new Date().toISOString(),
        };

        storeCachedProfile(profile);
        return profile;
    } catch (error) {
        console.warn(`US company profile fetch failed for ${normalizedTicker}:`, error);
        const cached = getCachedProfile('US', normalizedTicker);
        if (cached) {
            return { ...cached, source: 'CACHE' };
        }

        return buildMinimalProfile(normalizedTicker, 'US', fallbackCompanyName, 'UNAVAILABLE');
    }
};

const mapARProfileResponse = (
    ticker: string,
    payload: CompanyProfileResponse,
    fallbackCompanyName?: string,
): CompanyProfileData => {
    const baseProfile = payload.profile ?? {};
    return {
        ticker: ticker.toUpperCase(),
        market: 'AR',
        companyName: typeof baseProfile.companyName === 'string' && baseProfile.companyName.trim().length > 0
            ? baseProfile.companyName.trim()
            : fallbackCompanyName?.trim() || ticker.toUpperCase(),
        description: typeof baseProfile.description === 'string' && baseProfile.description.trim().length > 0
            ? baseProfile.description.trim()
            : undefined,
        sector: typeof baseProfile.sector === 'string' && baseProfile.sector.trim().length > 0
            ? baseProfile.sector.trim()
            : undefined,
        industry: typeof baseProfile.industry === 'string' && baseProfile.industry.trim().length > 0
            ? baseProfile.industry.trim()
            : undefined,
        marketCap: parseNumericValue(baseProfile.marketCap),
        exchange: typeof baseProfile.exchange === 'string' && baseProfile.exchange.trim().length > 0
            ? baseProfile.exchange.trim()
            : undefined,
        country: typeof baseProfile.country === 'string' && baseProfile.country.trim().length > 0
            ? baseProfile.country.trim()
            : undefined,
        website: typeof baseProfile.website === 'string' && baseProfile.website.trim().length > 0
            ? baseProfile.website.trim()
            : undefined,
        source: mapSourceToUiSource(payload.source),
        lastUpdatedAt: typeof baseProfile.lastUpdatedAt === 'string' && baseProfile.lastUpdatedAt.trim().length > 0
            ? baseProfile.lastUpdatedAt
            : new Date().toISOString(),
    };
};

const fetchARCompanyProfile = async (
    ticker: string,
    fallbackCompanyName?: string,
): Promise<CompanyProfileData> => {
    const normalizedTicker = ticker.toUpperCase();
    const freshCached = getCachedProfile('AR', normalizedTicker);
    if (freshCached?.source === 'CACHE') {
        return freshCached;
    }

    if (!supabase) {
        const cached = getCachedProfile('AR', normalizedTicker);
        if (cached) {
            return { ...cached, source: 'CACHE' };
        }

        return buildMinimalProfile(normalizedTicker, 'AR', fallbackCompanyName, 'UNAVAILABLE');
    }

    try {
        const { data, error } = await supabase.functions.invoke<CompanyProfileResponse>('fetch-argentina-company-profile', {
            body: { ticker: normalizedTicker },
        });

        if (error || !data?.profile) {
            throw new Error(error?.message || 'Argentina company profile unavailable');
        }

        const profile = mapARProfileResponse(normalizedTicker, data, fallbackCompanyName);
        if (profile.source === 'LIVE' || profile.source === 'CACHE') {
            storeCachedProfile(profile);
        }

        return profile;
    } catch (error) {
        console.warn(`AR company profile fetch failed for ${normalizedTicker}:`, error);
        const cached = getCachedProfile('AR', normalizedTicker);
        if (cached) {
            return { ...cached, source: 'CACHE' };
        }

        return buildMinimalProfile(normalizedTicker, 'AR', fallbackCompanyName, 'UNAVAILABLE');
    }
};

export const fetchCompanyProfile = async ({
    ticker,
    market,
    fallbackCompanyName,
}: {
    ticker: string;
    market: MarketType;
    fallbackCompanyName?: string;
}): Promise<CompanyProfileData> => {
    return market === 'US'
        ? fetchUSCompanyProfile(ticker, fallbackCompanyName)
        : fetchARCompanyProfile(ticker, fallbackCompanyName);
};

export const __resetCompanyProfileCacheForTests = (): void => {
    companyProfileCache.clear();
};
