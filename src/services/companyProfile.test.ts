import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockInvoke = vi.fn();

vi.mock('./supabase', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

import { __resetCompanyProfileCacheForTests, fetchCompanyProfile } from './companyProfile';

describe('fetchCompanyProfile', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    vi.restoreAllMocks();
    __resetCompanyProfileCacheForTests();
  });

  it('parses US company overview fields', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({
        Name: 'Apple Inc.',
        Description: 'Makes consumer electronics.',
        Sector: 'Technology',
        Industry: 'Consumer Electronics',
        MarketCapitalization: '3500000000000',
        Exchange: 'NASDAQ',
        Country: 'USA',
      }),
    } as Response);

    const result = await fetchCompanyProfile({ ticker: 'AAPL', market: 'US', fallbackCompanyName: 'Apple' });

    expect(result.companyName).toBe('Apple Inc.');
    expect(result.sector).toBe('Technology');
    expect(result.industry).toBe('Consumer Electronics');
    expect(result.marketCap).toBe(3500000000000);
    expect(result.exchange).toBe('NASDAQ');
    expect(result.country).toBe('USA');
    expect(result.source).toBe('LIVE');
  });

  it('falls back to cached or minimal US profile when overview fails', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: async () => ({ Name: 'NVIDIA Corporation' }),
    } as Response);

    const first = await fetchCompanyProfile({ ticker: 'NVDA', market: 'US', fallbackCompanyName: 'NVDA' });
    expect(first.companyName).toBe('NVIDIA Corporation');

    __resetCompanyProfileCacheForTests();
    vi.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({ Note: 'rate limit' }),
    } as Response);

    const minimal = await fetchCompanyProfile({ ticker: 'MSFT', market: 'US', fallbackCompanyName: 'Microsoft Corporation' });
    expect(minimal.companyName).toBe('Microsoft Corporation');
    expect(minimal.source).toBe('UNAVAILABLE');
  });

  it('maps AR edge function response and cache fallback correctly', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        source: 'cache_fallback',
        profile: {
          companyName: 'Ternium Argentina S.A.',
          description: 'Steel producer',
          sector: 'Materials',
          industry: 'Steel',
          marketCap: 123456789,
          exchange: 'BCBA',
          country: 'Argentina',
          website: 'https://example.com',
          lastUpdatedAt: '2026-02-28T00:00:00.000Z',
        },
      },
      error: null,
    });

    const result = await fetchCompanyProfile({ ticker: 'TXAR', market: 'AR', fallbackCompanyName: 'TXAR' });

    expect(result.companyName).toBe('Ternium Argentina S.A.');
    expect(result.sector).toBe('Materials');
    expect(result.source).toBe('CACHE');
    expect(mockInvoke).toHaveBeenCalledWith('fetch-argentina-company-profile', {
      body: { ticker: 'TXAR' },
    });
  });
});
