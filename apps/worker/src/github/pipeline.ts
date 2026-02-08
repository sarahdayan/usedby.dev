import type { CacheEntry } from '../cache/types';
import type { DevLogger } from '../dev-logger';
import { enrichRepos } from './enrich-repos';
import { filterDependents } from './filter-dependents';
import { scoreDependents } from './score-dependents';
import { searchDependents } from './search-dependents';

const ENRICH_CAP = 100;

export async function refreshDependents(
  packageName: string,
  env: { GITHUB_TOKEN: string },
  now: Date = new Date(),
  logger?: DevLogger
): Promise<CacheEntry> {
  logger?.time('search');
  const searchResult = await searchDependents(packageName, env, logger);
  logger?.timeEnd('search');

  // Filter forks before enrichment (reliably available from search).
  // Star counts from code search are often 0, so we defer that filter.
  const forks: string[] = [];
  const preFiltered = searchResult.repos.filter((repo) => {
    if (repo.isFork) {
      forks.push(repo.fullName);
      return false;
    }
    return true;
  });
  logger?.log(
    'pre-filter',
    `${searchResult.repos.length} \u2192 ${preFiltered.length} (removed ${forks.length} forks)`
  );
  if (forks.length > 0) logger?.log('  forks', forks.join(', '));

  const capped = preFiltered.slice(0, ENRICH_CAP);

  // Enrich only the capped set (adds real star counts + archived status).
  logger?.time('enrich');
  const enrichResult = await enrichRepos(capped, packageName, env, logger);
  logger?.timeEnd('enrich');

  // Now filter with real data from enrichment, then score.
  const filtered = filterDependents(enrichResult.repos, logger);

  const scored = scoreDependents(filtered, now);
  logger?.log('score', `${scored.length} repos`);

  const partial = searchResult.rateLimited || enrichResult.rateLimited;
  const isoNow = now.toISOString();

  return {
    repos: scored,
    fetchedAt: isoNow,
    lastAccessedAt: isoNow,
    partial,
  };
}
