import type { DevLogger } from '../dev-logger';
import { PROD_LIMITS } from './pipeline-limits';
import type { DependentRepo } from './types';

export function filterDependents(
  repos: DependentRepo[],
  logger?: DevLogger,
  minStars: number = PROD_LIMITS.minStars
): DependentRepo[] {
  const kept: DependentRepo[] = [];
  const forks: string[] = [];
  const archived: string[] = [];
  const lowStars: string[] = [];

  for (const repo of repos) {
    if (repo.isFork) {
      forks.push(repo.fullName);
    } else if (repo.archived) {
      archived.push(repo.fullName);
    } else if (repo.stars < minStars) {
      lowStars.push(repo.fullName);
    } else {
      kept.push(repo);
    }
  }

  const reasons: string[] = [];
  if (forks.length > 0) reasons.push(`${forks.length} forks`);
  if (archived.length > 0) reasons.push(`${archived.length} archived`);
  if (lowStars.length > 0)
    reasons.push(`${lowStars.length} <${minStars}\u2605`);

  logger?.log(
    'filter',
    `${repos.length} \u2192 ${kept.length} (${reasons.join(', ')})`
  );

  if (forks.length > 0) logger?.log('  forks', forks.join(', '));
  if (archived.length > 0) logger?.log('  archived', archived.join(', '));
  if (lowStars.length > 0) logger?.log('  low-stars', lowStars.join(', '));

  return kept;
}
