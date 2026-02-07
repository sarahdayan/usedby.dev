import type { CacheEntry } from '../cache/types';
import { enrichRepos } from './enrich-repos';
import { filterDependents } from './filter-dependents';
import { scoreDependents } from './score-dependents';
import { searchDependents } from './search-dependents';

export async function refreshDependents(
  packageName: string,
  env: { GITHUB_TOKEN: string },
  now: Date = new Date()
): Promise<CacheEntry> {
  const searchResult = await searchDependents(packageName, env);
  const enrichResult = await enrichRepos(searchResult.repos, env);
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
