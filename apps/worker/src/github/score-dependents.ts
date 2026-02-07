import type { DependentRepo, ScoredRepo } from './types';

const HALF_LIFE_DAYS = 365;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function scoreDependents(
  repos: DependentRepo[],
  now: Date = new Date()
): ScoredRepo[] {
  return repos
    .map((repo) => ({
      ...repo,
      score: repo.stars * recencyMultiplier(repo.lastPush, now),
    }))
    .sort((a, b) => b.score - a.score);
}

function recencyMultiplier(lastPush: string, now: Date): number {
  if (!lastPush) {
    return 0;
  }

  const pushDate = new Date(lastPush);

  if (Number.isNaN(pushDate.getTime())) {
    return 0;
  }

  const daysSinceLastPush = (now.getTime() - pushDate.getTime()) / MS_PER_DAY;

  if (daysSinceLastPush < 0) {
    return 1;
  }

  return Math.pow(0.5, daysSinceLastPush / HALF_LIFE_DAYS);
}
