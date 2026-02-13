import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { clearRegistry, registerStrategy } from '../../ecosystems/registry';
import { npmStrategy } from '../../ecosystems/npm';
import type { CacheEntry } from '../../cache/types';

vi.mock('../../cache/cache', () => ({
  buildCacheKey: vi.fn(),
  writeCache: vi.fn(),
}));

vi.mock('../../cache/append-snapshot', () => ({
  appendSnapshot: vi.fn(),
}));

vi.mock('../../github/pipeline', () => ({
  refreshDependents: vi.fn(),
}));

import { buildCacheKey, writeCache } from '../../cache/cache';
import { appendSnapshot } from '../../cache/append-snapshot';
import { refreshDependents } from '../../github/pipeline';
import { buildLockKey } from '../../cache/get-dependents';
import { handlePipelineMessage } from '../handle-pipeline-message';

beforeAll(() => {
  clearRegistry();
  registerStrategy(npmStrategy);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('handlePipelineMessage', () => {
  it('runs pipeline, writes cache, appends snapshot, and releases lock', async () => {
    const entry = createEntry();
    vi.mocked(buildCacheKey).mockReturnValue('npm:react');
    vi.mocked(refreshDependents).mockResolvedValue(entry);
    vi.mocked(writeCache).mockResolvedValue();
    vi.mocked(appendSnapshot).mockResolvedValue();

    const env = createEnv();
    await handlePipelineMessage(
      {
        platform: 'npm',
        packageName: 'react',
        enqueuedAt: new Date().toISOString(),
      },
      env
    );

    expect(refreshDependents).toHaveBeenCalledWith(
      npmStrategy,
      'react',
      { GITHUB_TOKEN: 'fake-token' },
      undefined,
      undefined,
      expect.anything()
    );
    expect(writeCache).toHaveBeenCalledWith(
      env.DEPENDENTS_CACHE,
      'npm:react',
      entry
    );
    expect(appendSnapshot).toHaveBeenCalledWith(
      env.DEPENDENTS_CACHE,
      'npm:react',
      entry
    );

    const lockKey = buildLockKey('npm:react');
    expect(env.DEPENDENTS_CACHE.delete).toHaveBeenCalledWith(lockKey);
  });

  it('releases lock even when pipeline fails', async () => {
    vi.mocked(buildCacheKey).mockReturnValue('npm:react');
    vi.mocked(refreshDependents).mockRejectedValue(new Error('API error'));

    const env = createEnv();

    await expect(
      handlePipelineMessage(
        {
          platform: 'npm',
          packageName: 'react',
          enqueuedAt: new Date().toISOString(),
        },
        env
      )
    ).rejects.toThrow('API error');

    const lockKey = buildLockKey('npm:react');
    expect(env.DEPENDENTS_CACHE.delete).toHaveBeenCalledWith(lockKey);
  });

  it('skips unknown platforms without throwing', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const env = createEnv();

    await handlePipelineMessage(
      {
        platform: 'unknown',
        packageName: 'foo',
        enqueuedAt: new Date().toISOString(),
      },
      env
    );

    expect(refreshDependents).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unknown platform')
    );
    consoleSpy.mockRestore();
  });

  it('does not write cache when pipeline fails', async () => {
    vi.mocked(buildCacheKey).mockReturnValue('npm:react');
    vi.mocked(refreshDependents).mockRejectedValue(new Error('API error'));

    const env = createEnv();

    await expect(
      handlePipelineMessage(
        {
          platform: 'npm',
          packageName: 'react',
          enqueuedAt: new Date().toISOString(),
        },
        env
      )
    ).rejects.toThrow();

    expect(writeCache).not.toHaveBeenCalled();
    expect(appendSnapshot).not.toHaveBeenCalled();
  });
});

function createEntry(overrides: Partial<CacheEntry> = {}): CacheEntry {
  return {
    repos: [],
    fetchedAt: new Date().toISOString(),
    lastAccessedAt: new Date().toISOString(),
    partial: false,
    ...overrides,
  };
}

function createEnv() {
  return {
    DEPENDENTS_CACHE: {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    } as unknown as KVNamespace,
    GITHUB_TOKEN: 'fake-token',
  };
}
