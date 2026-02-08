import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CacheEntry } from '../types';
import type { GetDependentsOptions } from '../get-dependents';
import type { ScoredRepo } from '../../github/types';

vi.mock('../cache', () => ({
  buildCacheKey: vi.fn(),
  readCache: vi.fn(),
  writeCache: vi.fn(),
  touchLastAccessed: vi.fn(),
}));

vi.mock('../../github/pipeline', () => ({
  refreshDependents: vi.fn(),
}));

import {
  buildCacheKey,
  readCache,
  touchLastAccessed,
  writeCache,
} from '../cache';
import { getDependents } from '../get-dependents';
import { refreshDependents } from '../../github/pipeline';

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
    });
    expect(options.waitUntil).toHaveBeenCalledTimes(1);

    // Await the promise passed to waitUntil to verify background work
    await (options.waitUntil as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(refreshDependents).toHaveBeenCalledWith('react', options.env, NOW);
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
    });
    expect(refreshDependents).toHaveBeenCalledWith(
      'react',
      options.env,
      NOW,
      undefined
    );
    expect(writeCache).toHaveBeenCalledWith(options.kv, 'npm:react', entry);
    expect(options.waitUntil).not.toHaveBeenCalled();
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
    packageJsonPath: 'package.json',
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
    get: vi.fn(),
    put: vi.fn(),
  } as unknown as KVNamespace;
}

function createOptions(overrides: Partial<GetDependentsOptions> = {}) {
  return {
    platform: 'npm',
    packageName: 'react',
    kv: createMockKV(),
    env: { GITHUB_TOKEN: 'fake-token' },
    waitUntil: vi.fn(),
    now: NOW,
    ...overrides,
  };
}
