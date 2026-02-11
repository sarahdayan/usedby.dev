import { afterEach, describe, expect, it, vi } from 'vitest';

import { npmStrategy } from '../../ecosystems/npm';
import type { DependentRepo, SearchResult } from '../types';

vi.mock('../search-dependents', () => ({
  searchDependents: vi.fn(),
}));

vi.mock('../enrich-repos', () => ({
  enrichRepos: vi.fn(),
}));

vi.mock('../fetch-dependent-count', () => ({
  fetchDependentCount: vi.fn(),
}));

import { enrichRepos } from '../enrich-repos';
import { fetchDependentCount } from '../fetch-dependent-count';
import { refreshCountOnly, refreshDependents } from '../pipeline';
import { PROD_LIMITS } from '../pipeline-limits';
import { searchDependents } from '../search-dependents';

const NOW = new Date('2025-01-15T12:00:00Z');
const ENV = { GITHUB_TOKEN: 'fake-token' };

afterEach(() => {
  vi.clearAllMocks();
});

function stubDefaultMocks() {
  vi.mocked(fetchDependentCount).mockResolvedValue(null);
}

describe('refreshDependents', () => {
  it('filters forks before enrichment, then filters archived and low-stars after', async () => {
    stubDefaultMocks();
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
    vi.mocked(enrichRepos).mockImplementation(async (_strategy, repos) => ({
      repos: repos.map((r) =>
        r.name === 'archived' ? { ...r, archived: true } : r
      ),
      rateLimited: false,
    }));

    const result = await refreshDependents(npmStrategy, 'react', ENV, NOW);

    expect(searchDependents).toHaveBeenCalledWith(
      npmStrategy,
      'react',
      ENV,
      undefined,
      PROD_LIMITS
    );

    // enrichRepos receives all non-fork repos (star filter deferred to post-enrichment)
    const enrichedRepos = vi.mocked(enrichRepos).mock.calls[0]![1];
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
    stubDefaultMocks();
    vi.mocked(searchDependents).mockResolvedValue({
      repos: [],
      partial: false,
      rateLimited: false,
      capped: false,
    });
    vi.mocked(enrichRepos).mockResolvedValue({ repos: [], rateLimited: false });

    const result = await refreshDependents(npmStrategy, 'react', ENV, NOW);

    expect(result).toEqual({
      repos: [],
      fetchedAt: NOW.toISOString(),
      lastAccessedAt: NOW.toISOString(),
      partial: false,
    });
  });

  it('sets partial to true when search is rate-limited', async () => {
    stubDefaultMocks();
    vi.mocked(searchDependents).mockResolvedValue({
      repos: [],
      partial: true,
      rateLimited: true,
      capped: false,
    });
    vi.mocked(enrichRepos).mockResolvedValue({ repos: [], rateLimited: false });

    const result = await refreshDependents(npmStrategy, 'react', ENV, NOW);

    expect(result.partial).toBe(true);
  });

  it('sets partial to true when enrich is rate-limited', async () => {
    stubDefaultMocks();
    vi.mocked(searchDependents).mockResolvedValue({
      repos: [],
      partial: false,
      rateLimited: false,
      capped: false,
    });
    vi.mocked(enrichRepos).mockResolvedValue({ repos: [], rateLimited: true });

    const result = await refreshDependents(npmStrategy, 'react', ENV, NOW);

    expect(result.partial).toBe(true);
  });

  it('propagates errors from pipeline stages', async () => {
    stubDefaultMocks();
    vi.mocked(searchDependents).mockRejectedValue(new Error('API error'));

    await expect(
      refreshDependents(npmStrategy, 'react', ENV, NOW)
    ).rejects.toThrow('API error');
  });

  it('includes dependentCount when resolution succeeds', async () => {
    vi.mocked(searchDependents).mockResolvedValue({
      repos: [],
      partial: false,
      rateLimited: false,
      capped: false,
    });
    vi.mocked(enrichRepos).mockResolvedValue({ repos: [], rateLimited: false });
    vi.spyOn(npmStrategy, 'resolveGitHubRepo').mockResolvedValue({
      owner: 'facebook',
      repo: 'react',
    });
    vi.mocked(fetchDependentCount).mockResolvedValue(12345);

    const result = await refreshDependents(npmStrategy, 'react', ENV, NOW);

    expect(result.dependentCount).toBe(12345);
  });

  it('omits dependentCount when repo resolution fails', async () => {
    vi.mocked(searchDependents).mockResolvedValue({
      repos: [],
      partial: false,
      rateLimited: false,
      capped: false,
    });
    vi.mocked(enrichRepos).mockResolvedValue({ repos: [], rateLimited: false });
    vi.spyOn(npmStrategy, 'resolveGitHubRepo').mockResolvedValue(null);
    vi.mocked(fetchDependentCount).mockResolvedValue(null);

    const result = await refreshDependents(npmStrategy, 'react', ENV, NOW);

    expect(result.dependentCount).toBeUndefined();
  });

  it('omits dependentCount when count fetch fails', async () => {
    vi.mocked(searchDependents).mockResolvedValue({
      repos: [],
      partial: false,
      rateLimited: false,
      capped: false,
    });
    vi.mocked(enrichRepos).mockResolvedValue({ repos: [], rateLimited: false });
    vi.spyOn(npmStrategy, 'resolveGitHubRepo').mockResolvedValue({
      owner: 'facebook',
      repo: 'react',
    });
    vi.mocked(fetchDependentCount).mockResolvedValue(null);

    const result = await refreshDependents(npmStrategy, 'react', ENV, NOW);

    expect(result.dependentCount).toBeUndefined();
  });
});

describe('refreshCountOnly', () => {
  it('returns a count-only CacheEntry with dependentCount', async () => {
    vi.spyOn(npmStrategy, 'resolveGitHubRepo').mockResolvedValue({
      owner: 'facebook',
      repo: 'react',
    });
    vi.mocked(fetchDependentCount).mockResolvedValue(12345);

    const result = await refreshCountOnly(npmStrategy, 'react', NOW);

    expect(result).toEqual({
      repos: [],
      fetchedAt: NOW.toISOString(),
      lastAccessedAt: NOW.toISOString(),
      partial: true,
      countOnly: true,
      dependentCount: 12345,
    });
  });

  it('omits dependentCount when repo resolution fails', async () => {
    vi.spyOn(npmStrategy, 'resolveGitHubRepo').mockResolvedValue(null);

    const result = await refreshCountOnly(npmStrategy, 'react', NOW);

    expect(result.countOnly).toBe(true);
    expect(result.repos).toEqual([]);
    expect(result.dependentCount).toBeUndefined();
  });

  it('omits dependentCount when count fetch returns null', async () => {
    vi.spyOn(npmStrategy, 'resolveGitHubRepo').mockResolvedValue({
      owner: 'facebook',
      repo: 'react',
    });
    vi.mocked(fetchDependentCount).mockResolvedValue(null);

    const result = await refreshCountOnly(npmStrategy, 'react', NOW);

    expect(result.countOnly).toBe(true);
    expect(result.dependentCount).toBeUndefined();
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
    manifestPath: 'package.json',
    ...overrides,
  };
}
