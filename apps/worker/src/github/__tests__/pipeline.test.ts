import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DependentRepo, SearchResult } from '../types';

vi.mock('../search-dependents', () => ({
  searchDependents: vi.fn(),
}));

vi.mock('../enrich-repos', () => ({
  enrichRepos: vi.fn(),
}));

import { enrichRepos } from '../enrich-repos';
import { refreshDependents } from '../pipeline';
import { PROD_LIMITS } from '../pipeline-limits';
import { searchDependents } from '../search-dependents';

const NOW = new Date('2025-01-15T12:00:00Z');
const ENV = { GITHUB_TOKEN: 'fake-token' };

afterEach(() => {
  vi.clearAllMocks();
});

describe('refreshDependents', () => {
  it('filters forks before enrichment, then filters archived and low-stars after', async () => {
    const searchRepos: DependentRepo[] = [
      createRepo({ name: 'popular', stars: 1000 }),
      createRepo({ name: 'fork', stars: 500, isFork: true }),
      createRepo({ name: 'archived', stars: 500 }),
      createRepo({ name: 'low-stars', stars: 2 }),
      createRepo({ name: 'less-popular', stars: 100 }),
    ];

    vi.mocked(searchDependents).mockResolvedValue({
      repos: searchRepos,
      partial: false,
      rateLimited: false,
      capped: false,
    } satisfies SearchResult);

    // Enrichment reveals that 'archived' is actually archived
    vi.mocked(enrichRepos).mockImplementation(async (repos) => ({
      repos: repos.map((r) =>
        r.name === 'archived' ? { ...r, archived: true } : r
      ),
      rateLimited: false,
    }));

    const result = await refreshDependents('react', ENV, NOW);

    expect(searchDependents).toHaveBeenCalledWith(
      'react',
      ENV,
      undefined,
      PROD_LIMITS
    );

    // enrichRepos receives all non-fork repos (star filter deferred to post-enrichment)
    const enrichedRepos = vi.mocked(enrichRepos).mock.calls[0]![0];
    expect(enrichedRepos.map((r) => r.name)).toEqual([
      'popular',
      'archived',
      'low-stars',
      'less-popular',
    ]);

    // Final result excludes archived and low-stars (filtered post-enrichment)
    expect(result.repos).toHaveLength(2);
    expect(result.repos.map((r) => r.name)).toEqual([
      'popular',
      'less-popular',
    ]);

    // scoreDependents assigns scores and sorts descending
    expect(result.repos[0]!.score).toBeGreaterThan(result.repos[1]!.score);
    expect(result.repos[0]!.score).toBe(1000); // pushed at NOW → multiplier 1.0
  });

  it('returns correct CacheEntry shape', async () => {
    vi.mocked(searchDependents).mockResolvedValue({
      repos: [],
      partial: false,
      rateLimited: false,
      capped: false,
    });
    vi.mocked(enrichRepos).mockResolvedValue({ repos: [], rateLimited: false });

    const result = await refreshDependents('react', ENV, NOW);

    expect(result).toEqual({
      repos: [],
      fetchedAt: NOW.toISOString(),
      lastAccessedAt: NOW.toISOString(),
      partial: false,
    });
  });

  it('sets partial to true when search is rate-limited', async () => {
    vi.mocked(searchDependents).mockResolvedValue({
      repos: [],
      partial: true,
      rateLimited: true,
      capped: false,
    });
    vi.mocked(enrichRepos).mockResolvedValue({ repos: [], rateLimited: false });

    const result = await refreshDependents('react', ENV, NOW);

    expect(result.partial).toBe(true);
  });

  it('sets partial to true when enrich is rate-limited', async () => {
    vi.mocked(searchDependents).mockResolvedValue({
      repos: [],
      partial: false,
      rateLimited: false,
      capped: false,
    });
    vi.mocked(enrichRepos).mockResolvedValue({ repos: [], rateLimited: true });

    const result = await refreshDependents('react', ENV, NOW);

    expect(result.partial).toBe(true);
  });

  it('propagates errors from pipeline stages', async () => {
    vi.mocked(searchDependents).mockRejectedValue(new Error('API error'));

    await expect(refreshDependents('react', ENV, NOW)).rejects.toThrow(
      'API error'
    );
  });
});

function createRepo(
  overrides: Partial<DependentRepo> & { name: string }
): DependentRepo {
  return {
    owner: 'test',
    fullName: `test/${overrides.name}`,
    stars: 100,
    lastPush: NOW.toISOString(),
    avatarUrl: 'https://example.com/avatar.png',
    isFork: false,
    archived: false,
    packageJsonPath: 'package.json',
    ...overrides,
  };
}
