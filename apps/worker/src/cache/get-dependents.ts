import type { ScoredRepo } from '../github/types';
import type { CacheEntry } from './types';
import type { DevLogger } from '../dev-logger';
import { refreshDependents } from '../github/pipeline';
import {
  FRESH_TTL_MS,
  buildCacheKey,
  readCache,
  touchLastAccessed,
  writeCache,
} from './cache';

export interface GetDependentsOptions {
  platform: string;
  packageName: string;
  kv: KVNamespace;
  env: { GITHUB_TOKEN: string };
  waitUntil: (promise: Promise<unknown>) => void;
  now?: Date;
  logger?: DevLogger;
}

export interface GetDependentsResult {
  repos: ScoredRepo[];
  fromCache: boolean;
  refreshing: boolean;
}

export async function getDependents(
  options: GetDependentsOptions
): Promise<GetDependentsResult> {
  const { platform, packageName, kv, env, waitUntil, now, logger } = options;
  const key = buildCacheKey(platform, packageName);
  const cached = await readCache(kv, key, now);

  if (cached.status === 'hit') {
    const ageMs =
      (now ?? new Date()).getTime() -
      new Date(cached.entry.fetchedAt).getTime();
    const ageMin = Math.round(ageMs / 60_000);
    logger?.log(
      'cache',
      `hit (${ageMin}m old, fresh for ${Math.round(FRESH_TTL_MS / 60_000)}m), ${cached.entry.repos.length} repos`
    );
    waitUntil(touchLastAccessed(kv, key, cached.entry, now));

    return { repos: cached.entry.repos, fromCache: true, refreshing: false };
  }

  if (cached.status === 'stale') {
    const ageMs =
      (now ?? new Date()).getTime() -
      new Date(cached.entry.fetchedAt).getTime();
    const ageH = Math.round(ageMs / 3_600_000);
    logger?.log(
      'cache',
      `stale (${ageH}h old), ${cached.entry.repos.length} repos, refreshing in background`
    );
    waitUntil(backgroundRefresh(packageName, env, kv, key, cached.entry, now));

    return { repos: cached.entry.repos, fromCache: true, refreshing: true };
  }

  logger?.log('cache', 'miss');
  const entry = await refreshDependents(packageName, env, now, logger);
  await writeCache(kv, key, entry);

  return { repos: entry.repos, fromCache: false, refreshing: false };
}

async function backgroundRefresh(
  packageName: string,
  env: { GITHUB_TOKEN: string },
  kv: KVNamespace,
  key: string,
  staleEntry: CacheEntry,
  now?: Date
): Promise<void> {
  try {
    const entry = await refreshDependents(packageName, env, now);
    await writeCache(kv, key, entry);
  } catch (error) {
    // Refresh failed — still bump lastAccessedAt so the entry isn't
    // evicted while it's actively being served to users
    await touchLastAccessed(kv, key, staleEntry, now);
    console.error('Background refresh failed:', error);
  }
}
