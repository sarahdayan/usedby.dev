import type { CacheEntry } from '../cache/types';
import { enrichRepos } from './enrich-repos';
import { filterDependents } from './filter-dependents';
import { scoreDependents } from './score-dependents';
import { searchDependents } from './search-dependents';

const ENRICH_CAP = 200;

export async function refreshDependents(
  packageName: string,
  env: { GITHUB_TOKEN: string },
  now: Date = new Date()
): Promise<CacheEntry> {
  const searchResult = await searchDependents(packageName, env);

  // Filter forks and low-star repos before enrichment (these fields are
  // already available from search results).
  const preFiltered = filterDependents(searchResult.repos);

  // Score and cap so we only enrich the top candidates.
  const preScored = scoreDependents(preFiltered, now);
  const capped = preScored.slice(0, ENRICH_CAP);

  // Enrich only the capped set (adds fresh `archived` status).
  const enrichResult = await enrichRepos(capped, env);

  // Remove repos that enrichment revealed as archived, then re-score with
  // the refreshed data.
  const postFiltered = enrichResult.repos.filter((repo) => !repo.archived);
  const scored = scoreDependents(postFiltered, now);

  const partial = searchResult.rateLimited || enrichResult.rateLimited;
  const isoNow = now.toISOString();

  return {
    repos: scored,
    fetchedAt: isoNow,
    lastAccessedAt: isoNow,
    partial,
  };
}
