import type { CacheEntry } from '../cache/types';
import { enrichRepos } from './enrich-repos';
import { filterDependents } from './filter-dependents';
import { scoreDependents } from './score-dependents';
import { searchDependents } from './search-dependents';

const ENRICH_CAP = 20;

export async function refreshDependents(
  packageName: string,
  env: { GITHUB_TOKEN: string },
  now: Date = new Date()
): Promise<CacheEntry> {
  const searchResult = await searchDependents(packageName, env);

  // Filter forks before enrichment (reliably available from search).
  // Star counts from code search are often 0, so we defer that filter.
  const preFiltered = searchResult.repos.filter((repo) => !repo.isFork);
  const capped = preFiltered.slice(0, ENRICH_CAP);

  // Enrich only the capped set (adds real star counts + archived status).
  const enrichResult = await enrichRepos(capped, env);

  // Now filter with real data from enrichment, then score.
  const filtered = filterDependents(enrichResult.repos);
  const scored = scoreDependents(filtered, now);

  const partial = searchResult.rateLimited || enrichResult.rateLimited;
  const isoNow = now.toISOString();

  return {
    repos: scored,
    fetchedAt: isoNow,
    lastAccessedAt: isoNow,
    partial,
  };
}
