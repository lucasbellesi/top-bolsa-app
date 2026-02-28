import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockInvoke = vi.fn();
const mockFrom = vi.fn();

vi.mock('./supabase', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { __resetUsApiCachesForTests, fetchARMarketGainers, fetchUSMarketGainers } from './api';

const createCacheQueryChain = (result: unknown) => {
  const limit = vi.fn().mockResolvedValue(result);
  const order = vi.fn().mockReturnValue({ limit });
  const eq = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ eq });

  return {
    select,
    eq,
    order,
    limit,
  };
};

describe('fetchARMarketGainers', () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

  beforeEach(() => {
    (globalThis as Record<string, unknown>).__DEV__ = false;
    mockInvoke.mockReset();
    mockFrom.mockReset();
    warnSpy.mockClear();
  });

  it('returns LIVE when edge function returns live stocks', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        source: 'live',
        stocks: [
          {
            id: 'EDN',
            ticker: 'EDN',
            market: 'AR',
            price: 2007,
            percentChange: 3.56,
            sparkline: [],
          },
          {
            id: 'BMA',
            ticker: 'BMA',
            market: 'AR',
            price: 13110,
            percentChange: 3.14,
            sparkline: [],
          },
        ],
      },
      error: null,
    });

    const result = await fetchARMarketGainers('1D');

    expect(result.source).toBe('LIVE');
    expect(result.stocks).toHaveLength(2);
    expect(result.stocks[0].ticker).toBe('EDN');
    expect(mockInvoke).toHaveBeenCalledWith(
      'fetch-argentina-market',
      { body: { timeframe: '1D' } },
    );
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('sends 1H timeframe to edge function when requested', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        source: 'live',
        stocks: [
          {
            id: 'GGAL',
            ticker: 'GGAL',
            market: 'AR',
            price: 4520,
            percentChange: 0.84,
            sparkline: [],
          },
        ],
      },
      error: null,
    });

    const result = await fetchARMarketGainers('1H');

    expect(result.source).toBe('LIVE');
    expect(mockInvoke).toHaveBeenCalledWith(
      'fetch-argentina-market',
      { body: { timeframe: '1H' } },
    );
  });

  it('returns CACHE when edge function responds with cache_fallback', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        source: 'cache_fallback',
        stale: true,
        stocks: [
          {
            id: 'GGAL',
            ticker: 'GGAL',
            market: 'AR',
            price: 4500,
            percentChange: 1.2,
            sparkline: [],
          },
        ],
      },
      error: null,
    });

    const result = await fetchARMarketGainers('1W');

    expect(result.source).toBe('CACHE');
    expect(result.stale).toBe(true);
    expect(result.stocks).toHaveLength(1);
    expect(result.stocks[0].ticker).toBe('GGAL');
  });

  it('falls back to cache table when edge function returns an error', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'edge function unavailable' },
    });

    const cacheChain = createCacheQueryChain({
      data: [
        {
          ticker: 'SUPV',
          market: 'AR',
          price: 3100,
          percent_change: 2.5,
          sparkline: [],
        },
        {
          ticker: 'PAMP',
          market: 'AR',
          price: 5300,
          percent_change: 1.2,
          sparkline: [],
        },
      ],
      error: null,
    });

    mockFrom.mockReturnValue(cacheChain);

    const result = await fetchARMarketGainers('1M');

    expect(result.source).toBe('CACHE');
    expect(result.stale).toBe(true);
    expect(result.stocks).toHaveLength(2);
    expect(result.stocks[0].ticker).toBe('SUPV');
    expect(mockFrom).toHaveBeenCalledWith('argentina_market_cache');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('returns UNAVAILABLE when edge function and cache both fail in non-dev mode', async () => {
    mockInvoke.mockRejectedValue(new Error('network down'));

    const cacheChain = createCacheQueryChain({
      data: [],
      error: null,
    });

    mockFrom.mockReturnValue(cacheChain);

    const result = await fetchARMarketGainers('YTD');

    expect(result.source).toBe('UNAVAILABLE');
    expect(result.stocks).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('falls back to MOCK in dev mode when edge function and cache both fail', async () => {
    (globalThis as Record<string, unknown>).__DEV__ = true;
    mockInvoke.mockRejectedValue(new Error('network down'));

    const cacheChain = createCacheQueryChain({
      data: [],
      error: null,
    });

    mockFrom.mockReturnValue(cacheChain);

    const result = await fetchARMarketGainers('YTD');

    expect(result.source).toBe('MOCK');
    expect(result.stocks).toHaveLength(10);
  });
});

describe('fetchUSMarketGainers (3M)', () => {
  beforeEach(() => {
    (globalThis as Record<string, unknown>).__DEV__ = false;
    vi.restoreAllMocks();
    __resetUsApiCachesForTests();
  });

  it('calculates real 3M performance from daily series and sets companyName fallback', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('function=TOP_GAINERS_LOSERS')) {
        return {
          json: async () => ({
            top_gainers: [
              { ticker: 'NVDA', price: '900', change_percentage: '2.1%' },
              { ticker: 'AAPL', price: '200', change_percentage: '1.2%' },
            ],
          }),
        } as Response;
      }

      if (url.includes('function=TIME_SERIES_DAILY') && url.includes('symbol=NVDA')) {
        return {
          json: async () => ({
            'Time Series (Daily)': {
              '2026-02-26': { '4. close': '120.00' },
              '2025-11-26': { '4. close': '100.00' },
            },
          }),
        } as Response;
      }

      if (url.includes('function=TIME_SERIES_DAILY') && url.includes('symbol=AAPL')) {
        return {
          json: async () => ({
            'Time Series (Daily)': {
              '2026-02-26': { '4. close': '110.00' },
              '2025-11-26': { '4. close': '100.00' },
            },
          }),
        } as Response;
      }

      return {
        json: async () => ({}),
      } as Response;
    });

    const result = await fetchUSMarketGainers('3M');

    expect(result.source).toBe('LIVE');
    expect(result.stocks).toHaveLength(2);
    expect(result.stocks[0].ticker).toBe('NVDA');
    expect(result.stocks[0].companyName).toBe('NVIDIA Corporation');
    expect(result.stocks[0].percentChange).toBeCloseTo(20, 5);
    expect(result.stocks[1].companyName).toBe('Apple Inc.');
    expect(fetchMock).toHaveBeenCalled();
  });
});

describe('fetchUSMarketGainers', () => {
  beforeEach(() => {
    (globalThis as Record<string, unknown>).__DEV__ = false;
    vi.restoreAllMocks();
    __resetUsApiCachesForTests();
  });

  it('enriches live US rows with company names from yahoo search when top gainers omits them', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('function=TOP_GAINERS_LOSERS')) {
        return {
          json: async () => ({
            top_gainers: [
              { ticker: 'RSVRW', price: '304.97', change_percentage: '133.33%' },
              { ticker: 'ALBT', price: '1582.95', change_percentage: '114.48%' },
            ],
          }),
        } as Response;
      }

      if (url.includes('function=TIME_SERIES_INTRADAY') && url.includes('symbol=RSVRW')) {
        return {
          json: async () => ({
            'Time Series (5min)': {
              '2026-02-26 16:00:00': { '4. close': '304.97' },
              '2026-02-25 16:00:00': { '4. close': '130.70' },
            },
          }),
        } as Response;
      }

      if (url.includes('function=TIME_SERIES_INTRADAY') && url.includes('symbol=ALBT')) {
        return {
          json: async () => ({
            'Time Series (5min)': {
              '2026-02-26 16:00:00': { '4. close': '1582.95' },
              '2026-02-25 16:00:00': { '4. close': '738.10' },
            },
          }),
        } as Response;
      }

      if (url.includes('finance/search') && url.includes('q=RSVRW')) {
        return {
          json: async () => ({
            quotes: [
              { symbol: 'RSVRW', longname: 'Reservoir Media, Inc.', quoteType: 'EQUITY' },
            ],
          }),
        } as Response;
      }

      if (url.includes('finance/search') && url.includes('q=ALBT')) {
        return {
          json: async () => ({
            quotes: [
              { symbol: 'ALBT', longname: 'Avalon GloboCare Corp.', quoteType: 'EQUITY' },
            ],
          }),
        } as Response;
      }

      return {
        json: async () => ({}),
      } as Response;
    });

    const result = await fetchUSMarketGainers('1D');

    expect(result.source).toBe('LIVE');
    expect(result.stocks).toHaveLength(2);
    expect(result.stocks[0].ticker).toBe('RSVRW');
    expect(result.stocks[0].companyName).toBe('Reservoir Media, Inc.');
    expect(result.stocks[1].companyName).toBe('Avalon GloboCare Corp.');
    expect(fetchMock).toHaveBeenCalled();
  });

  it('calculates 1M rankings from daily history instead of raw top movers percentages', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('function=TOP_GAINERS_LOSERS')) {
        return {
          json: async () => ({
            top_gainers: [
              { ticker: 'AAPL', price: '200', change_percentage: '99%' },
              { ticker: 'MSFT', price: '410', change_percentage: '1%' },
            ],
          }),
        } as Response;
      }

      if (url.includes('function=TIME_SERIES_DAILY') && url.includes('symbol=AAPL')) {
        return {
          json: async () => ({
            'Time Series (Daily)': {
              '2026-02-26': { '4. close': '105.00' },
              '2026-01-26': { '4. close': '100.00' },
            },
          }),
        } as Response;
      }

      if (url.includes('function=TIME_SERIES_DAILY') && url.includes('symbol=MSFT')) {
        return {
          json: async () => ({
            'Time Series (Daily)': {
              '2026-02-26': { '4. close': '130.00' },
              '2026-01-26': { '4. close': '100.00' },
            },
          }),
        } as Response;
      }

      return {
        json: async () => ({}),
      } as Response;
    });

    const result = await fetchUSMarketGainers('1M');

    expect(result.source).toBe('LIVE');
    expect(result.stocks).toHaveLength(2);
    expect(result.stocks[0].ticker).toBe('MSFT');
    expect(result.stocks[0].percentChange).toBeCloseTo(30, 5);
    expect(result.stocks[1].ticker).toBe('AAPL');
    expect(result.stocks[1].percentChange).toBeCloseTo(5, 5);
  });

  it('avoids extra company name lookups for 1H so intraday data can still load', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('function=TOP_GAINERS_LOSERS')) {
        return {
          json: async () => ({
            top_gainers: [
              { ticker: 'AAPL', price: '200', change_percentage: '1.2%' },
              { ticker: 'MSFT', price: '410', change_percentage: '0.9%' },
            ],
          }),
        } as Response;
      }

      if (url.includes('function=TIME_SERIES_INTRADAY') && url.includes('symbol=AAPL')) {
        return {
          json: async () => ({
            'Time Series (5min)': {
              '2026-02-26 16:00:00': { '4. close': '210.00' },
              '2026-02-26 15:00:00': { '4. close': '200.00' },
            },
          }),
        } as Response;
      }

      if (url.includes('function=TIME_SERIES_INTRADAY') && url.includes('symbol=MSFT')) {
        return {
          json: async () => ({
            'Time Series (5min)': {
              '2026-02-26 16:00:00': { '4. close': '418.20' },
              '2026-02-26 15:00:00': { '4. close': '410.00' },
            },
          }),
        } as Response;
      }

      return {
        json: async () => ({}),
      } as Response;
    });

    const result = await fetchUSMarketGainers('1H');

    expect(result.source).toBe('LIVE');
    expect(result.stocks).toHaveLength(2);
    expect(result.stocks[0].ticker).toBe('AAPL');
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('finance/search'))).toBe(false);
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('function=OVERVIEW'))).toBe(false);
  });

  it('uses daily history for 1D US rankings', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('function=TOP_GAINERS_LOSERS')) {
        return {
          json: async () => ({
            top_gainers: [
              { ticker: 'AAPL', price: '200', change_percentage: '1.2%' },
            ],
          }),
        } as Response;
      }

      if (url.includes('function=TIME_SERIES_DAILY') && url.includes('symbol=AAPL')) {
        return {
          json: async () => ({
            'Time Series (Daily)': {
              '2026-02-26': { '4. close': '210.00' },
              '2026-02-25': { '4. close': '200.00' },
            },
          }),
        } as Response;
      }

      return {
        json: async () => ({}),
      } as Response;
    });

    const result = await fetchUSMarketGainers('1D');

    expect(result.source).toBe('LIVE');
    expect(result.stocks).toHaveLength(1);
    expect(result.stocks[0].percentChange).toBeCloseTo(5, 5);
  });

  it('falls back to top movers rows when US historical fetches fail', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('function=TOP_GAINERS_LOSERS')) {
        return {
          json: async () => ({
            top_gainers: [
              { ticker: 'AAPL', price: '200', change_percentage: '1.2%' },
              { ticker: 'MSFT', price: '410', change_percentage: '0.9%' },
            ],
          }),
        } as Response;
      }

      if (url.includes('function=TIME_SERIES_DAILY')) {
        return {
          json: async () => ({
            Note: 'Thank you for using Alpha Vantage',
          }),
        } as Response;
      }

      return {
        json: async () => ({}),
      } as Response;
    });

    const result = await fetchUSMarketGainers('1D');

    expect(result.source).toBe('LIVE');
    expect(result.stocks).toHaveLength(2);
    expect(result.stocks[0].ticker).toBe('AAPL');
    expect(result.stocks[0].percentChange).toBeCloseTo(1.2, 5);
  });
});
