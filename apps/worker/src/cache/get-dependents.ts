import type { ScoredRepo } from '../github/types';
import type { CacheEntry } from './types';
import type { DevLogger } from '../dev-logger';
import type { EcosystemStrategy } from '../ecosystems/strategy';
import { refreshDependents } from '../github/pipeline';
import type { PipelineLimits } from '../github/pipeline-limits';
import { PROD_LIMITS } from '../github/pipeline-limits';
import {
  FRESH_TTL_MS,
  buildCacheKey,
  readCache,
  touchLastAccessed,
  writeCache,
} from './cache';

export interface GetDependentsOptions {
  strategy: EcosystemStrategy;
  packageName: string;
  kv: KVNamespace;
  env: { GITHUB_TOKEN: string };
  waitUntil: (promise: Promise<unknown>) => void;
  now?: Date;
  logger?: DevLogger;
  limits?: PipelineLimits;
}

export interface GetDependentsResult {
  repos: ScoredRepo[];
  fromCache: boolean;
  refreshing: boolean;
  dependentCount?: number;
}

export async function getDependents(
  options: GetDependentsOptions
): Promise<GetDependentsResult> {
  const {
    strategy,
    packageName,
    kv,
    env,
    waitUntil,
    now,
    logger,
    limits = PROD_LIMITS,
  } = options;
  const key = buildCacheKey(strategy.platform, packageName);
  const cached = await readCache(kv, key, now);

  if (cached.status === 'hit' && !cached.entry.countOnly) {
    const ageMs =
      (now ?? new Date()).getTime() -
      new Date(cached.entry.fetchedAt).getTime();
    const ageMin = Math.round(ageMs / 60_000);
    logger?.log(
      'cache',
      `hit (${ageMin}m old, fresh for ${Math.round(FRESH_TTL_MS / 60_000)}m), ${cached.entry.repos.length} repos`
    );
    waitUntil(touchLastAccessed(kv, key, cached.entry, now));

    return {
      repos: cached.entry.repos,
      fromCache: true,
      refreshing: false,
      dependentCount: cached.entry.dependentCount,
    };
  }

  if (cached.status === 'stale' && !cached.entry.countOnly) {
    const ageMs =
      (now ?? new Date()).getTime() -
      new Date(cached.entry.fetchedAt).getTime();
    const ageH = Math.round(ageMs / 3_600_000);
    logger?.log(
      'cache',
      `stale (${ageH}h old), ${cached.entry.repos.length} repos, refreshing in background`
    );
    waitUntil(
      tryBackgroundRefresh(
        strategy,
        packageName,
        env,
        kv,
        key,
        cached.entry,
        now,
        limits
      )
    );

    return {
      repos: cached.entry.repos,
      fromCache: true,
      refreshing: true,
      dependentCount: cached.entry.dependentCount,
    };
  }

  logger?.log(
    'cache',
    cached.entry?.countOnly ? 'count-only entry, upgrading' : 'miss'
  );
  const entry = await refreshDependents(
    strategy,
    packageName,
    env,
    now,
    logger,
    limits
  );
  await writeCache(kv, key, entry);

  return {
    repos: entry.repos,
    fromCache: false,
    refreshing: false,
    dependentCount: entry.dependentCount,
  };
}

const LOCK_TTL_SECONDS = 300;

export function buildLockKey(cacheKey: string): string {
  return `lock:${cacheKey}`;
}

async function tryBackgroundRefresh(
  strategy: EcosystemStrategy,
  packageName: string,
  env: { GITHUB_TOKEN: string },
  kv: KVNamespace,
  key: string,
  staleEntry: CacheEntry,
  now?: Date,
  limits: PipelineLimits = PROD_LIMITS
): Promise<void> {
  const lockKey = buildLockKey(key);
  const existing = await kv.get(lockKey);

  if (existing !== null) {
    return;
  }

  await kv.put(lockKey, '1', { expirationTtl: LOCK_TTL_SECONDS });

  try {
    const entry = await refreshDependents(
      strategy,
      packageName,
      env,
      now,
      undefined,
      limits
    );
    await writeCache(kv, key, entry);
  } catch (error) {
    // Refresh failed — still bump lastAccessedAt so the entry isn't
    // evicted while it's actively being served to users
    await touchLastAccessed(kv, key, staleEntry, now);
    console.error('Background refresh failed:', error);
  } finally {
    await kv.delete(lockKey);
  }
}
