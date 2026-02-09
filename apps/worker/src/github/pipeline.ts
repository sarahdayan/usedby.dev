import type { CacheEntry } from '../cache/types';
import type { DevLogger } from '../dev-logger';
import { enrichRepos } from './enrich-repos';
import { fetchDependentCount } from './fetch-dependent-count';
import { filterDependents } from './filter-dependents';
import type { PipelineLimits } from './pipeline-limits';
import { PAID_LIMITS } from './pipeline-limits';
import { resolveGitHubRepo } from './resolve-repo';
import { scoreDependents } from './score-dependents';
import { searchDependents } from './search-dependents';

export async function refreshDependents(
  packageName: string,
  env: { GITHUB_TOKEN: string },
  now: Date = new Date(),
  logger?: DevLogger,
  limits: PipelineLimits = PAID_LIMITS
): Promise<CacheEntry> {
  const mode = limits === PAID_LIMITS ? 'prod' : 'dev';
  logger?.log(
    'limits',
    `${mode} (maxPages=${limits.maxPages}, enrichCap=${limits.enrichCap}, minStars=${limits.minStars})`
  );

  logger?.time('search');
  const [searchResult, dependentCount] = await Promise.all([
    searchDependents(packageName, env, logger, limits),
    resolveDependentCount(packageName, logger),
  ]);
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
  if (forks.length > 0) {
    logger?.log('  forks', forks.join(', '));
  }

  const capped = preFiltered.slice(0, limits.enrichCap);

  // Enrich only the capped set (adds real star counts + archived status).
  logger?.time('enrich');
  const enrichResult = await enrichRepos(
    capped,
    packageName,
    env,
    logger,
    limits
  );
  logger?.timeEnd('enrich');

  // Now filter with real data from enrichment, then score.
  const filtered = filterDependents(
    enrichResult.repos,
    logger,
    limits.minStars
  );

  const scored = scoreDependents(filtered, now);
  logger?.log('score', `${scored.length} repos`);

  const partial = searchResult.rateLimited || enrichResult.rateLimited;
  const isoNow = now.toISOString();

  return {
    repos: scored,
    fetchedAt: isoNow,
    lastAccessedAt: isoNow,
    partial,
    ...(dependentCount != null && { dependentCount }),
  };
}

async function resolveDependentCount(
  packageName: string,
  logger?: DevLogger
): Promise<number | null> {
  logger?.log('dependent-count', `resolving ${packageName}`);
  const ghRepo = await resolveGitHubRepo(packageName, logger);

  if (!ghRepo) {
    logger?.log('dependent-count', 'could not resolve GitHub repo');
    return null;
  }

  const count = await fetchDependentCount(ghRepo.owner, ghRepo.repo, logger);
  logger?.log('dependent-count', count != null ? String(count) : 'not found');

  return count;
}
