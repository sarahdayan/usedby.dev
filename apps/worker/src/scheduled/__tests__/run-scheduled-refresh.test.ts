import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { clearRegistry, registerStrategy } from '../../ecosystems/registry';
import { npmStrategy } from '../../ecosystems/npm';
import type { CacheEntry, CacheMetadata } from '../../cache/types';

vi.mock('../../github/pipeline', () => ({
  refreshDependents: vi.fn(),
  refreshCountOnly: vi.fn(),
}));

vi.mock('../../cache/cache', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../cache/cache')>();

  return {
    ...actual,
    writeCache: vi.fn(),
  };
});

import { writeCache } from '../../cache/cache';
import { refreshCountOnly, refreshDependents } from '../../github/pipeline';
import { EVICTION_TTL_MS, runScheduledRefresh } from '../run-scheduled-refresh';

const NOW = new Date('2025-01-15T12:00:00Z');
const ENV = {
  DEPENDENTS_CACHE: createMockKV(),
  GITHUB_TOKEN: 'fake-token',
};

beforeAll(() => {
  clearRegistry();
  registerStrategy(npmStrategy);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('runScheduledRefresh', () => {
  it('returns no-op result when KV is empty', async () => {
    ENV.DEPENDENTS_CACHE = createMockKV();

    const result = await runScheduledRefresh(ENV, NOW);

    expect(result).toEqual({
      keysScanned: 0,
      refreshed: 0,
      skipped: 0,
      evicted: 0,
      errors: 0,
      abortedDueToRateLimit: false,
    });
  });

  it('skips all entries when everything is fresh', async () => {
    const freshMetadata: CacheMetadata = {
      fetchedAt: new Date(NOW.getTime() - 1000).toISOString(),
      lastAccessedAt: NOW.toISOString(),
      partial: false,
    };

    ENV.DEPENDENTS_CACHE = createMockKV({
      keys: [
        { name: 'npm:react', metadata: freshMetadata },
        { name: 'npm:vue', metadata: freshMetadata },
      ],
    });

    const result = await runScheduledRefresh(ENV, NOW);

    expect(result.keysScanned).toBe(2);
    expect(result.refreshed).toBe(0);
    expect(result.skipped).toBe(2);
    expect(refreshDependents).not.toHaveBeenCalled();
  });

  it('refreshes stale entries oldest first', async () => {
    const staleOld: CacheMetadata = {
      fetchedAt: new Date(NOW.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      lastAccessedAt: NOW.toISOString(),
      partial: false,
    };
    const staleNew: CacheMetadata = {
      fetchedAt: new Date(NOW.getTime() - 25 * 60 * 60 * 1000).toISOString(),
      lastAccessedAt: NOW.toISOString(),
      partial: false,
    };

    ENV.DEPENDENTS_CACHE = createMockKV({
      keys: [
        { name: 'npm:vue', metadata: staleNew },
        { name: 'npm:react', metadata: staleOld },
      ],
    });

    vi.mocked(refreshDependents).mockResolvedValue(createEntry());

    const result = await runScheduledRefresh(ENV, NOW);

    expect(result.refreshed).toBe(2);
    // Oldest first
    expect(vi.mocked(refreshDependents).mock.calls[0]![1]).toBe('react');
    expect(vi.mocked(refreshDependents).mock.calls[1]![1]).toBe('vue');
  });

  it('prioritizes partial entries over stale entries', async () => {
    const stale: CacheMetadata = {
      fetchedAt: new Date(NOW.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      lastAccessedAt: NOW.toISOString(),
      partial: false,
    };
    const partialStale: CacheMetadata = {
      fetchedAt: new Date(NOW.getTime() - 13 * 60 * 60 * 1000).toISOString(),
      lastAccessedAt: NOW.toISOString(),
      partial: true,
    };

    ENV.DEPENDENTS_CACHE = createMockKV({
      keys: [
        { name: 'npm:react', metadata: stale },
        { name: 'npm:vue', metadata: partialStale },
      ],
    });

    vi.mocked(refreshDependents).mockResolvedValue(createEntry());

    const result = await runScheduledRefresh(ENV, NOW);

    expect(result.refreshed).toBe(2);
    // Partial first
    expect(vi.mocked(refreshDependents).mock.calls[0]![1]).toBe('vue');
    expect(vi.mocked(refreshDependents).mock.calls[1]![1]).toBe('react');
  });

  it('aborts remaining refreshes on rate limit error', async () => {
    const stale: CacheMetadata = {
      fetchedAt: new Date(NOW.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      lastAccessedAt: NOW.toISOString(),
      partial: false,
    };

    ENV.DEPENDENTS_CACHE = createMockKV({
      keys: [
        { name: 'npm:react', metadata: stale },
        { name: 'npm:vue', metadata: stale },
      ],
    });

    const { RequestError } = await import('@octokit/request-error');
    const rateLimitError = new RequestError('rate limit', 403, {
      response: {
        status: 403,
        url: '',
        headers: { 'x-ratelimit-remaining': '0' },
        data: {},
      },
      request: { method: 'GET', url: '', headers: {} },
    });

    vi.mocked(refreshDependents).mockRejectedValue(rateLimitError);

    const result = await runScheduledRefresh(ENV, NOW);

    expect(result.abortedDueToRateLimit).toBe(true);
    expect(result.refreshed).toBe(0);
    expect(refreshDependents).toHaveBeenCalledTimes(1);
  });

  it('skips non-rate-limit errors and continues', async () => {
    const stale: CacheMetadata = {
      fetchedAt: new Date(NOW.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      lastAccessedAt: NOW.toISOString(),
      partial: false,
    };

    ENV.DEPENDENTS_CACHE = createMockKV({
      keys: [
        { name: 'npm:react', metadata: stale },
        { name: 'npm:vue', metadata: stale },
      ],
    });

    vi.mocked(refreshDependents)
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce(createEntry());

    const result = await runScheduledRefresh(ENV, NOW);

    expect(result.errors).toBe(1);
    expect(result.refreshed).toBe(1);
    expect(result.abortedDueToRateLimit).toBe(false);
  });

  it('respects MAX_REFRESHES_PER_RUN cap', async () => {
    const stale: CacheMetadata = {
      fetchedAt: new Date(NOW.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      lastAccessedAt: NOW.toISOString(),
      partial: false,
    };

    ENV.DEPENDENTS_CACHE = createMockKV({
      keys: Array.from({ length: 10 }, (_, i) => ({
        name: `npm:pkg-${i}`,
        metadata: stale,
      })),
    });

    vi.mocked(refreshDependents).mockResolvedValue(createEntry());

    const result = await runScheduledRefresh(ENV, NOW);

    expect(refreshDependents).toHaveBeenCalledTimes(5);
    expect(result.refreshed).toBe(5);
    expect(result.keysScanned).toBe(10);
    expect(result.skipped).toBe(0);
  });

  it('handles cursor pagination across multiple pages', async () => {
    const stale: CacheMetadata = {
      fetchedAt: new Date(NOW.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      lastAccessedAt: NOW.toISOString(),
      partial: false,
    };

    ENV.DEPENDENTS_CACHE = createMockKV({
      keys: [
        { name: 'npm:react', metadata: stale },
        { name: 'npm:vue', metadata: stale },
      ],
      pageSize: 1,
    });

    vi.mocked(refreshDependents).mockResolvedValue(createEntry());

    const result = await runScheduledRefresh(ENV, NOW);

    expect(result.keysScanned).toBe(2);
    expect(result.refreshed).toBe(2);
  });

  it('skips entries without metadata', async () => {
    ENV.DEPENDENTS_CACHE = createMockKV({
      keys: [{ name: 'npm:react', metadata: null }],
    });

    const result = await runScheduledRefresh(ENV, NOW);

    expect(result.keysScanned).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.refreshed).toBe(0);
    expect(result.evicted).toBe(0);
    expect(refreshDependents).not.toHaveBeenCalled();
  });

  it('evicts entries not accessed in 30+ days', async () => {
    const inactive: CacheMetadata = {
      fetchedAt: new Date(NOW.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      lastAccessedAt: new Date(
        NOW.getTime() - EVICTION_TTL_MS - 1
      ).toISOString(),
      partial: false,
    };

    ENV.DEPENDENTS_CACHE = createMockKV({
      keys: [{ name: 'npm:react', metadata: inactive }],
    });

    const result = await runScheduledRefresh(ENV, NOW);

    expect(ENV.DEPENDENTS_CACHE.delete).toHaveBeenCalledWith('npm:react');
    expect(ENV.DEPENDENTS_CACHE.delete).toHaveBeenCalledWith(
      'history:npm:react'
    );
    expect(result.evicted).toBe(1);
    expect(result.refreshed).toBe(0);
    expect(refreshDependents).not.toHaveBeenCalled();
  });

  it('refreshes stale entries with recent access, does not evict', async () => {
    const stale: CacheMetadata = {
      fetchedAt: new Date(NOW.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      lastAccessedAt: NOW.toISOString(),
      partial: false,
    };

    ENV.DEPENDENTS_CACHE = createMockKV({
      keys: [{ name: 'npm:react', metadata: stale }],
    });

    vi.mocked(refreshDependents).mockResolvedValue(createEntry());

    const result = await runScheduledRefresh(ENV, NOW);

    expect(ENV.DEPENDENTS_CACHE.delete).not.toHaveBeenCalled();
    expect(result.evicted).toBe(0);
    expect(result.refreshed).toBe(1);
  });

  it('evicts inactive entries and refreshes stale entries in a mixed set', async () => {
    const inactive: CacheMetadata = {
      fetchedAt: new Date(NOW.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      lastAccessedAt: new Date(
        NOW.getTime() - EVICTION_TTL_MS - 1
      ).toISOString(),
      partial: false,
    };
    const stale: CacheMetadata = {
      fetchedAt: new Date(NOW.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      lastAccessedAt: NOW.toISOString(),
      partial: false,
    };

    ENV.DEPENDENTS_CACHE = createMockKV({
      keys: [
        { name: 'npm:old-lib', metadata: inactive },
        { name: 'npm:react', metadata: stale },
      ],
    });

    vi.mocked(refreshDependents).mockResolvedValue(createEntry());

    const result = await runScheduledRefresh(ENV, NOW);

    expect(ENV.DEPENDENTS_CACHE.delete).toHaveBeenCalledWith('npm:old-lib');
    expect(ENV.DEPENDENTS_CACHE.delete).toHaveBeenCalledWith(
      'history:npm:old-lib'
    );
    expect(result.evicted).toBe(1);
    expect(result.refreshed).toBe(1);
    expect(result.keysScanned).toBe(2);
    expect(result.skipped).toBe(0);
  });

  it('evicts entry exactly at the 30-day boundary', async () => {
    const atBoundary: CacheMetadata = {
      fetchedAt: new Date(NOW.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      lastAccessedAt: new Date(NOW.getTime() - EVICTION_TTL_MS).toISOString(),
      partial: false,
    };

    ENV.DEPENDENTS_CACHE = createMockKV({
      keys: [{ name: 'npm:boundary-lib', metadata: atBoundary }],
    });

    const result = await runScheduledRefresh(ENV, NOW);

    expect(ENV.DEPENDENTS_CACHE.delete).toHaveBeenCalledWith(
      'npm:boundary-lib'
    );
    expect(ENV.DEPENDENTS_CACHE.delete).toHaveBeenCalledWith(
      'history:npm:boundary-lib'
    );
    expect(result.evicted).toBe(1);
    expect(result.refreshed).toBe(0);
  });

  it('does not evict entry just under the 30-day boundary', async () => {
    const justUnder: CacheMetadata = {
      fetchedAt: new Date(NOW.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      lastAccessedAt: new Date(
        NOW.getTime() - EVICTION_TTL_MS + 1
      ).toISOString(),
      partial: false,
    };

    ENV.DEPENDENTS_CACHE = createMockKV({
      keys: [{ name: 'npm:active-lib', metadata: justUnder }],
    });

    vi.mocked(refreshDependents).mockResolvedValue(createEntry());

    const result = await runScheduledRefresh(ENV, NOW);

    expect(ENV.DEPENDENTS_CACHE.delete).not.toHaveBeenCalled();
    expect(result.evicted).toBe(0);
    expect(result.refreshed).toBe(1);
  });

  it('evicts inactive entries before refreshing stale entries', async () => {
    const inactive: CacheMetadata = {
      fetchedAt: new Date(NOW.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      lastAccessedAt: new Date(
        NOW.getTime() - EVICTION_TTL_MS - 1
      ).toISOString(),
      partial: false,
    };
    const stale: CacheMetadata = {
      fetchedAt: new Date(NOW.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      lastAccessedAt: NOW.toISOString(),
      partial: false,
    };

    ENV.DEPENDENTS_CACHE = createMockKV({
      keys: [
        { name: 'npm:old-lib', metadata: inactive },
        { name: 'npm:react', metadata: stale },
      ],
    });

    const callOrder: string[] = [];
    (
      ENV.DEPENDENTS_CACHE.delete as ReturnType<typeof vi.fn>
    ).mockImplementation(() => {
      callOrder.push('delete');
      return Promise.resolve();
    });
    vi.mocked(refreshDependents).mockImplementation(() => {
      callOrder.push('refresh');
      return Promise.resolve(createEntry());
    });

    await runScheduledRefresh(ENV, NOW);

    // Two deletes (data key + history key), then refresh
    expect(callOrder).toEqual(['delete', 'delete', 'refresh']);
  });

  it('dispatches to refreshCountOnly for count-only entries', async () => {
    const countOnlyMeta: CacheMetadata = {
      fetchedAt: new Date(NOW.getTime() - 13 * 60 * 60 * 1000).toISOString(),
      lastAccessedAt: NOW.toISOString(),
      partial: true,
      countOnly: true,
    };

    ENV.DEPENDENTS_CACHE = createMockKV({
      keys: [{ name: 'npm:react', metadata: countOnlyMeta }],
    });

    vi.mocked(refreshCountOnly).mockResolvedValue(
      createEntry({ countOnly: true, partial: true })
    );

    const result = await runScheduledRefresh(ENV, NOW);

    expect(refreshCountOnly).toHaveBeenCalledWith(npmStrategy, 'react', NOW);
    expect(refreshDependents).not.toHaveBeenCalled();
    expect(result.refreshed).toBe(1);
  });

  it('dispatches to refreshDependents for full entries', async () => {
    const fullMeta: CacheMetadata = {
      fetchedAt: new Date(NOW.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      lastAccessedAt: NOW.toISOString(),
      partial: false,
    };

    ENV.DEPENDENTS_CACHE = createMockKV({
      keys: [{ name: 'npm:react', metadata: fullMeta }],
    });

    vi.mocked(refreshDependents).mockResolvedValue(createEntry());

    const result = await runScheduledRefresh(ENV, NOW);

    expect(refreshDependents).toHaveBeenCalled();
    expect(refreshCountOnly).not.toHaveBeenCalled();
    expect(result.refreshed).toBe(1);
  });

  it('preserves existing lastAccessedAt on scheduled refresh', async () => {
    const originalLastAccessedAt = new Date(
      NOW.getTime() - 12 * 60 * 60 * 1000
    ).toISOString();
    const stale: CacheMetadata = {
      fetchedAt: new Date(NOW.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      lastAccessedAt: originalLastAccessedAt,
      partial: false,
    };

    ENV.DEPENDENTS_CACHE = createMockKV({
      keys: [{ name: 'npm:react', metadata: stale }],
    });

    vi.mocked(refreshDependents).mockResolvedValue(
      createEntry({ lastAccessedAt: NOW.toISOString() })
    );

    await runScheduledRefresh(ENV, NOW);

    const writtenEntry = vi.mocked(writeCache).mock.calls[0]![2];
    expect(writtenEntry.lastAccessedAt).toBe(originalLastAccessedAt);
  });
});

function createEntry(overrides: Partial<CacheEntry> = {}): CacheEntry {
  return {
    repos: [],
    fetchedAt: NOW.toISOString(),
    lastAccessedAt: NOW.toISOString(),
    partial: false,
    ...overrides,
  };
}

interface MockKVOptions {
  keys?: Array<{ name: string; metadata: CacheMetadata | null }>;
  pageSize?: number;
}

function createMockKV(options: MockKVOptions = {}) {
  const { keys = [], pageSize } = options;

  const list = vi.fn((opts?: { cursor?: string }) => {
    const cursor = opts?.cursor;
    const startIndex = cursor ? parseInt(cursor, 10) : 0;

    if (pageSize) {
      const endIndex = startIndex + pageSize;
      const pageKeys = keys.slice(startIndex, endIndex);
      const list_complete = endIndex >= keys.length;

      return Promise.resolve({
        keys: pageKeys,
        list_complete,
        cursor: list_complete ? '' : String(endIndex),
      });
    }

    return Promise.resolve({
      keys,
      list_complete: true,
      cursor: '',
    });
  });

  return {
    list,
    get: vi.fn(() => Promise.resolve(null)),
    put: vi.fn(() => Promise.resolve()),
    delete: vi.fn(() => Promise.resolve()),
  } as unknown as KVNamespace;
}
