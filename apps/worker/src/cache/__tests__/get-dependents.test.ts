import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CacheEntry } from '../types';
import type { GetDependentsOptions } from '../get-dependents';
import { buildLockKey } from '../get-dependents';
import { npmStrategy } from '../../ecosystems/npm';
import type { ScoredRepo } from '../../github/types';

vi.mock('../cache', () => ({
  buildCacheKey: vi.fn(),
  readCache: vi.fn(),
  writeCache: vi.fn(),
  touchLastAccessed: vi.fn(),
}));

vi.mock('../append-snapshot', () => ({
  appendSnapshot: vi.fn(),
}));

vi.mock('../../github/pipeline', () => ({
  refreshDependents: vi.fn(),
  refreshCountOnly: vi.fn(),
}));

import {
  buildCacheKey,
  readCache,
  touchLastAccessed,
  writeCache,
} from '../cache';
import { getDependentCountForBadge, getDependents } from '../get-dependents';
import { refreshCountOnly, refreshDependents } from '../../github/pipeline';
import { PROD_LIMITS } from '../../github/pipeline-limits';

const NOW = new Date('2025-01-15T12:00:00Z');

afterEach(() => {
  vi.clearAllMocks();
});

describe('getDependents', () => {
  it('returns cached repos on hit without calling refreshDependents', async () => {
    const entry = createEntry();
    vi.mocked(buildCacheKey).mockReturnValue('npm:react');
    vi.mocked(readCache).mockResolvedValue({ status: 'hit', entry });
    vi.mocked(touchLastAccessed).mockResolvedValue();

    const options = createOptions();
    const result = await getDependents(options);

    expect(result).toEqual({
      repos: entry.repos,
      fromCache: true,
      refreshing: false,
      dependentCount: undefined,
    });
    expect(refreshDependents).not.toHaveBeenCalled();
  });

  it('calls touchLastAccessed via waitUntil on hit', async () => {
    const entry = createEntry();
    vi.mocked(buildCacheKey).mockReturnValue('npm:react');
    vi.mocked(readCache).mockResolvedValue({ status: 'hit', entry });
    vi.mocked(touchLastAccessed).mockResolvedValue();

    const options = createOptions();
    await getDependents(options);

    expect(options.waitUntil).toHaveBeenCalledTimes(1);
    expect(touchLastAccessed).toHaveBeenCalledWith(
      options.kv,
      'npm:react',
      entry,
      NOW
    );
  });

  it('returns stale repos and triggers background refresh', async () => {
    const entry = createEntry();
    const freshEntry = createEntry({ fetchedAt: NOW.toISOString() });

    vi.mocked(buildCacheKey).mockReturnValue('npm:react');
    vi.mocked(readCache).mockResolvedValue({ status: 'stale', entry });
    vi.mocked(refreshDependents).mockResolvedValue(freshEntry);
    vi.mocked(writeCache).mockResolvedValue();

    const options = createOptions();
    const result = await getDependents(options);

    expect(result).toEqual({
      repos: entry.repos,
      fromCache: true,
      refreshing: true,
      dependentCount: undefined,
    });
    expect(options.waitUntil).toHaveBeenCalledTimes(1);

    // Await the promise passed to waitUntil to verify background work
    await (options.waitUntil as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(refreshDependents).toHaveBeenCalledWith(
      npmStrategy,
      'react',
      options.env,
      NOW,
      undefined,
      PROD_LIMITS
    );
    expect(writeCache).toHaveBeenCalledWith(
      options.kv,
      'npm:react',
      freshEntry
    );
  });

  it('does not call touchLastAccessed on successful background refresh', async () => {
    const entry = createEntry();
    vi.mocked(buildCacheKey).mockReturnValue('npm:react');
    vi.mocked(readCache).mockResolvedValue({ status: 'stale', entry });
    vi.mocked(refreshDependents).mockResolvedValue(
      createEntry({ fetchedAt: NOW.toISOString() })
    );
    vi.mocked(writeCache).mockResolvedValue();

    const options = createOptions();
    await getDependents(options);

    await (options.waitUntil as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(touchLastAccessed).not.toHaveBeenCalled();
  });

  it('calls touchLastAccessed when background refresh fails', async () => {
    const entry = createEntry();
    vi.mocked(buildCacheKey).mockReturnValue('npm:react');
    vi.mocked(readCache).mockResolvedValue({ status: 'stale', entry });
    vi.mocked(refreshDependents).mockRejectedValue(new Error('API error'));
    vi.mocked(touchLastAccessed).mockResolvedValue();

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const options = createOptions();
    await getDependents(options);

    await (options.waitUntil as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(touchLastAccessed).toHaveBeenCalledWith(
      options.kv,
      'npm:react',
      entry,
      NOW
    );

    consoleSpy.mockRestore();
  });

  it('swallows background refresh errors', async () => {
    const entry = createEntry();
    vi.mocked(buildCacheKey).mockReturnValue('npm:react');
    vi.mocked(readCache).mockResolvedValue({ status: 'stale', entry });
    vi.mocked(refreshDependents).mockRejectedValue(new Error('API error'));
    vi.mocked(touchLastAccessed).mockResolvedValue();

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const options = createOptions();
    await getDependents(options);

    // Await the background refresh promise — should not reject
    await (options.waitUntil as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(consoleSpy).toHaveBeenCalledWith(
      'Background refresh failed:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('calls refreshDependents synchronously on miss and writes cache', async () => {
    const entry = createEntry({ fetchedAt: NOW.toISOString() });
    vi.mocked(buildCacheKey).mockReturnValue('npm:react');
    vi.mocked(readCache).mockResolvedValue({ status: 'miss', entry: null });
    vi.mocked(refreshDependents).mockResolvedValue(entry);
    vi.mocked(writeCache).mockResolvedValue();

    const options = createOptions();
    const result = await getDependents(options);

    expect(result).toEqual({
      repos: entry.repos,
      fromCache: false,
      refreshing: false,
      dependentCount: undefined,
    });
    expect(refreshDependents).toHaveBeenCalledWith(
      npmStrategy,
      'react',
      options.env,
      NOW,
      undefined,
      PROD_LIMITS
    );
    expect(writeCache).toHaveBeenCalledWith(options.kv, 'npm:react', entry);
    // waitUntil is called once for appendSnapshot
    expect(options.waitUntil).toHaveBeenCalledTimes(1);
  });

  it('passes through dependentCount on hit', async () => {
    const entry = createEntry({ dependentCount: 5000 });
    vi.mocked(buildCacheKey).mockReturnValue('npm:react');
    vi.mocked(readCache).mockResolvedValue({ status: 'hit', entry });
    vi.mocked(touchLastAccessed).mockResolvedValue();

    const result = await getDependents(createOptions());

    expect(result.dependentCount).toBe(5000);
  });

  it('passes through dependentCount on stale', async () => {
    const entry = createEntry({ dependentCount: 3000 });
    vi.mocked(buildCacheKey).mockReturnValue('npm:react');
    vi.mocked(readCache).mockResolvedValue({ status: 'stale', entry });
    vi.mocked(refreshDependents).mockResolvedValue(createEntry());
    vi.mocked(writeCache).mockResolvedValue();

    const result = await getDependents(createOptions());

    expect(result.dependentCount).toBe(3000);
  });

  it('passes through dependentCount on miss', async () => {
    const entry = createEntry({ dependentCount: 999 });
    vi.mocked(buildCacheKey).mockReturnValue('npm:react');
    vi.mocked(readCache).mockResolvedValue({ status: 'miss', entry: null });
    vi.mocked(refreshDependents).mockResolvedValue(entry);
    vi.mocked(writeCache).mockResolvedValue();

    const result = await getDependents(createOptions());

    expect(result.dependentCount).toBe(999);
  });

  it('treats count-only hit as miss and runs full pipeline', async () => {
    const countOnlyEntry = createEntry({
      repos: [],
      countOnly: true,
      partial: true,
      dependentCount: 500,
    });
    const fullEntry = createEntry({ fetchedAt: NOW.toISOString() });

    vi.mocked(buildCacheKey).mockReturnValue('npm:react');
    vi.mocked(readCache).mockResolvedValue({
      status: 'hit',
      entry: countOnlyEntry,
    });
    vi.mocked(refreshDependents).mockResolvedValue(fullEntry);
    vi.mocked(writeCache).mockResolvedValue();

    const options = createOptions();
    const result = await getDependents(options);

    expect(refreshDependents).toHaveBeenCalledWith(
      npmStrategy,
      'react',
      options.env,
      NOW,
      undefined,
      PROD_LIMITS
    );
    expect(writeCache).toHaveBeenCalledWith(options.kv, 'npm:react', fullEntry);
    expect(result.fromCache).toBe(false);
    expect(result.refreshing).toBe(false);
  });

  it('treats count-only stale as miss and runs full pipeline', async () => {
    const countOnlyEntry = createEntry({
      repos: [],
      countOnly: true,
      partial: true,
      dependentCount: 500,
    });
    const fullEntry = createEntry({ fetchedAt: NOW.toISOString() });

    vi.mocked(buildCacheKey).mockReturnValue('npm:react');
    vi.mocked(readCache).mockResolvedValue({
      status: 'stale',
      entry: countOnlyEntry,
    });
    vi.mocked(refreshDependents).mockResolvedValue(fullEntry);
    vi.mocked(writeCache).mockResolvedValue();

    const options = createOptions();
    const result = await getDependents(options);

    expect(refreshDependents).toHaveBeenCalledWith(
      npmStrategy,
      'react',
      options.env,
      NOW,
      undefined,
      PROD_LIMITS
    );
    expect(writeCache).toHaveBeenCalledWith(options.kv, 'npm:react', fullEntry);
    expect(result.fromCache).toBe(false);
    expect(result.refreshing).toBe(false);
    // waitUntil is called once for appendSnapshot
    expect(options.waitUntil).toHaveBeenCalledTimes(1);
  });

  it('enqueues and returns pending when queue is provided on miss', async () => {
    vi.mocked(buildCacheKey).mockReturnValue('npm:react');
    vi.mocked(readCache).mockResolvedValue({ status: 'miss', entry: null });
    vi.mocked(writeCache).mockResolvedValue();

    const queue = createMockQueue();
    const options = createOptions({ queue });
    const result = await getDependents(options);

    expect(result).toEqual({
      repos: [],
      fromCache: false,
      refreshing: false,
      pending: true,
    });
    expect(refreshDependents).not.toHaveBeenCalled();
    expect(writeCache).toHaveBeenCalledWith(
      options.kv,
      'npm:react',
      expect.objectContaining({ pending: true, repos: [] })
    );
    expect(queue.send).toHaveBeenCalledWith(
      expect.objectContaining({
        platform: 'npm',
        packageName: 'react',
      })
    );
  });

  it('skips enqueue when lock is held but still returns pending', async () => {
    vi.mocked(buildCacheKey).mockReturnValue('npm:react');
    vi.mocked(readCache).mockResolvedValue({ status: 'miss', entry: null });

    const kv = createMockKV();
    const lockKey = buildLockKey('npm:react');
    (kv.get as ReturnType<typeof vi.fn>).mockImplementation((key: string) =>
      Promise.resolve(key === lockKey ? '1' : null)
    );

    const queue = createMockQueue();
    const options = createOptions({ kv, queue });
    const result = await getDependents(options);

    expect(result.pending).toBe(true);
    expect(queue.send).not.toHaveBeenCalled();
    expect(writeCache).not.toHaveBeenCalled();
  });

  it('acquires lock when enqueuing', async () => {
    vi.mocked(buildCacheKey).mockReturnValue('npm:react');
    vi.mocked(readCache).mockResolvedValue({ status: 'miss', entry: null });
    vi.mocked(writeCache).mockResolvedValue();

    const kv = createMockKV();
    const queue = createMockQueue();
    const options = createOptions({ kv, queue });
    await getDependents(options);

    const lockKey = buildLockKey('npm:react');
    expect(kv.put).toHaveBeenCalledWith(lockKey, '1', {
      expirationTtl: 300,
    });
  });

  it('runs synchronous pipeline when queue is not provided on miss', async () => {
    const entry = createEntry({ fetchedAt: NOW.toISOString() });
    vi.mocked(buildCacheKey).mockReturnValue('npm:react');
    vi.mocked(readCache).mockResolvedValue({ status: 'miss', entry: null });
    vi.mocked(refreshDependents).mockResolvedValue(entry);
    vi.mocked(writeCache).mockResolvedValue();

    const options = createOptions();
    const result = await getDependents(options);

    expect(result.pending).toBeUndefined();
    expect(refreshDependents).toHaveBeenCalled();
  });

  it('runs existence check before enqueuing', async () => {
    vi.mocked(buildCacheKey).mockReturnValue('npm:react');
    vi.mocked(readCache).mockResolvedValue({ status: 'miss', entry: null });

    const existenceCheck = vi.fn().mockResolvedValue(false);
    const queue = createMockQueue();
    const options = createOptions({ queue, existenceCheck });
    const result = await getDependents(options);

    expect(result.repos).toBeNull();
    expect(queue.send).not.toHaveBeenCalled();
  });

  it('propagates pipeline errors on miss', async () => {
    vi.mocked(buildCacheKey).mockReturnValue('npm:react');
    vi.mocked(readCache).mockResolvedValue({ status: 'miss', entry: null });
    vi.mocked(refreshDependents).mockRejectedValue(
      new Error('Pipeline failed')
    );

    const options = createOptions();

    await expect(getDependents(options)).rejects.toThrow('Pipeline failed');
  });

  it('skips background refresh when lock is held', async () => {
    const entry = createEntry();
    vi.mocked(buildCacheKey).mockReturnValue('npm:react');
    vi.mocked(readCache).mockResolvedValue({ status: 'stale', entry });

    const kv = createMockKV();
    const lockKey = buildLockKey('npm:react');
    (kv.get as ReturnType<typeof vi.fn>).mockImplementation((key: string) =>
      Promise.resolve(key === lockKey ? '1' : null)
    );

    const options = createOptions({ kv });
    await getDependents(options);

    await (options.waitUntil as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(refreshDependents).not.toHaveBeenCalled();
  });

  it('acquires and releases lock during background refresh', async () => {
    const entry = createEntry();
    const freshEntry = createEntry({ fetchedAt: NOW.toISOString() });
    vi.mocked(buildCacheKey).mockReturnValue('npm:react');
    vi.mocked(readCache).mockResolvedValue({ status: 'stale', entry });
    vi.mocked(refreshDependents).mockResolvedValue(freshEntry);
    vi.mocked(writeCache).mockResolvedValue();

    const kv = createMockKV();
    const lockKey = buildLockKey('npm:react');

    const options = createOptions({ kv });
    await getDependents(options);

    await (options.waitUntil as ReturnType<typeof vi.fn>).mock.calls[0]![0];

    expect(kv.put).toHaveBeenCalledWith(lockKey, '1', {
      expirationTtl: 300,
    });
    expect(kv.delete).toHaveBeenCalledWith(lockKey);
  });

  it('releases lock even when background refresh fails', async () => {
    const entry = createEntry();
    vi.mocked(buildCacheKey).mockReturnValue('npm:react');
    vi.mocked(readCache).mockResolvedValue({ status: 'stale', entry });
    vi.mocked(refreshDependents).mockRejectedValue(new Error('API error'));
    vi.mocked(touchLastAccessed).mockResolvedValue();

    const kv = createMockKV();
    const lockKey = buildLockKey('npm:react');

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const options = createOptions({ kv });
    await getDependents(options);

    await (options.waitUntil as ReturnType<typeof vi.fn>).mock.calls[0]![0];

    expect(kv.delete).toHaveBeenCalledWith(lockKey);
    consoleSpy.mockRestore();
  });
});

describe('getDependentCountForBadge', () => {
  it('returns count from dependentCount on hit', async () => {
    const entry = createEntry({ dependentCount: 5000 });
    vi.mocked(buildCacheKey).mockReturnValue('npm:react');
    vi.mocked(readCache).mockResolvedValue({ status: 'hit', entry });
    vi.mocked(touchLastAccessed).mockResolvedValue();

    const result = await getDependentCountForBadge(createOptions());

    expect(result).toEqual({ count: 5000, fromCache: true });
  });

  it('falls back to repos.length on hit when dependentCount is missing', async () => {
    const entry = createEntry();
    vi.mocked(buildCacheKey).mockReturnValue('npm:react');
    vi.mocked(readCache).mockResolvedValue({ status: 'hit', entry });
    vi.mocked(touchLastAccessed).mockResolvedValue();

    const result = await getDependentCountForBadge(createOptions());

    expect(result).toEqual({ count: 1, fromCache: true });
  });

  it('returns null count for count-only hit without dependentCount', async () => {
    const entry = createEntry({
      repos: [],
      countOnly: true,
      partial: true,
    });
    vi.mocked(buildCacheKey).mockReturnValue('npm:react');
    vi.mocked(readCache).mockResolvedValue({ status: 'hit', entry });
    vi.mocked(touchLastAccessed).mockResolvedValue();

    const result = await getDependentCountForBadge(createOptions());

    expect(result).toEqual({ count: null, fromCache: true });
  });

  it('returns count on stale and triggers background refresh', async () => {
    const entry = createEntry({ dependentCount: 3000 });
    vi.mocked(buildCacheKey).mockReturnValue('npm:react');
    vi.mocked(readCache).mockResolvedValue({ status: 'stale', entry });
    vi.mocked(refreshDependents).mockResolvedValue(createEntry());
    vi.mocked(writeCache).mockResolvedValue();

    const options = createOptions();
    const result = await getDependentCountForBadge(options);

    expect(result).toEqual({ count: 3000, fromCache: true });
    expect(options.waitUntil).toHaveBeenCalledTimes(1);
  });

  it('runs refreshCountOnly synchronously on miss', async () => {
    const countOnlyEntry = createEntry({
      repos: [],
      countOnly: true,
      partial: true,
      dependentCount: 500,
    });
    vi.mocked(buildCacheKey).mockReturnValue('npm:react');
    vi.mocked(readCache).mockResolvedValue({ status: 'miss', entry: null });
    vi.mocked(refreshCountOnly).mockResolvedValue(countOnlyEntry);
    vi.mocked(writeCache).mockResolvedValue();

    const options = createOptions();
    const result = await getDependentCountForBadge(options);

    expect(result).toEqual({ count: 500, fromCache: false });
    expect(refreshCountOnly).toHaveBeenCalledWith(
      npmStrategy,
      'react',
      NOW,
      undefined
    );
    expect(refreshDependents).not.toHaveBeenCalled();
    expect(writeCache).toHaveBeenCalledWith(
      options.kv,
      'npm:react',
      countOnlyEntry
    );
  });

  it('returns null count on miss when resolveGitHubRepo fails', async () => {
    const countOnlyEntry = createEntry({
      repos: [],
      countOnly: true,
      partial: true,
    });
    vi.mocked(buildCacheKey).mockReturnValue('npm:react');
    vi.mocked(readCache).mockResolvedValue({ status: 'miss', entry: null });
    vi.mocked(refreshCountOnly).mockResolvedValue(countOnlyEntry);
    vi.mocked(writeCache).mockResolvedValue();

    const result = await getDependentCountForBadge(createOptions());

    expect(result).toEqual({ count: null, fromCache: false });
  });
});

describe('tryBackgroundRefresh with count-only entries', () => {
  it('dispatches to refreshCountOnly for count-only stale entries', async () => {
    const staleEntry = createEntry({
      repos: [],
      countOnly: true,
      partial: true,
      dependentCount: 100,
    });
    const refreshedEntry = createEntry({
      repos: [],
      countOnly: true,
      partial: true,
      dependentCount: 150,
    });

    vi.mocked(buildCacheKey).mockReturnValue('npm:react');
    vi.mocked(readCache).mockResolvedValue({
      status: 'stale',
      entry: staleEntry,
    });
    vi.mocked(refreshCountOnly).mockResolvedValue(refreshedEntry);
    vi.mocked(writeCache).mockResolvedValue();

    const options = createOptions();
    await getDependentCountForBadge(options);

    // Await background refresh
    await (options.waitUntil as ReturnType<typeof vi.fn>).mock.calls[0]![0];

    expect(refreshCountOnly).toHaveBeenCalled();
    expect(refreshDependents).not.toHaveBeenCalled();
    expect(writeCache).toHaveBeenCalled();
  });

  it('dispatches to refreshDependents for full stale entries', async () => {
    const staleEntry = createEntry({ dependentCount: 100 });
    const refreshedEntry = createEntry({ dependentCount: 150 });

    vi.mocked(buildCacheKey).mockReturnValue('npm:react');
    vi.mocked(readCache).mockResolvedValue({
      status: 'stale',
      entry: staleEntry,
    });
    vi.mocked(refreshDependents).mockResolvedValue(refreshedEntry);
    vi.mocked(writeCache).mockResolvedValue();

    const options = createOptions();
    await getDependentCountForBadge(options);

    await (options.waitUntil as ReturnType<typeof vi.fn>).mock.calls[0]![0];

    expect(refreshDependents).toHaveBeenCalled();
    expect(refreshCountOnly).not.toHaveBeenCalled();
  });
});

function createScoredRepo(name: string): ScoredRepo {
  return {
    owner: 'test',
    name,
    fullName: `test/${name}`,
    stars: 100,
    lastPush: '2025-01-01T00:00:00Z',
    avatarUrl: 'https://example.com/avatar.png',
    isFork: false,
    archived: false,
    manifestPath: 'package.json',
    score: 95,
  };
}

function createEntry(overrides: Partial<CacheEntry> = {}): CacheEntry {
  return {
    repos: [createScoredRepo('repo')],
    fetchedAt: '2025-01-15T10:00:00Z',
    lastAccessedAt: '2025-01-15T10:00:00Z',
    partial: false,
    ...overrides,
  };
}

function createMockKV() {
  return {
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  } as unknown as KVNamespace;
}

function createMockQueue() {
  return {
    send: vi.fn().mockResolvedValue(undefined),
    sendBatch: vi.fn().mockResolvedValue(undefined),
  } as unknown as Queue;
}

function createOptions(overrides: Partial<GetDependentsOptions> = {}) {
  return {
    strategy: npmStrategy,
    packageName: 'react',
    kv: createMockKV(),
    env: { GITHUB_TOKEN: 'fake-token' },
    waitUntil: vi.fn(),
    now: NOW,
    ...overrides,
  };
}
