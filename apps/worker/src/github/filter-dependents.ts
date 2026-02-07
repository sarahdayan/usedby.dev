import type { DependentRepo } from './types';

export const MIN_STARS = 5;

export function filterDependents(repos: DependentRepo[]): DependentRepo[] {
  return repos.filter(
    (repo) => !repo.isFork && !repo.archived && repo.stars >= MIN_STARS
  );
}
