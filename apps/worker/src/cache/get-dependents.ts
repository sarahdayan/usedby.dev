import type { ScoredRepo } from '../github/types';
import type { CacheEntry } from './types';
import type { DevLogger } from '../dev-logger';
import type { EcosystemStrategy } from '../ecosystems/strategy';
import { refreshCountOnly, refreshDependents } from '../github/pipeline';
import type { PipelineLimits } from '../github/pipeline-limits';
import { PROD_LIMITS } from '../github/pipeline-limits';
import { appendSnapshot } from './append-snapshot';
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
  /** Optional guard called on cache miss before running the pipeline. Return false to abort. */
  existenceCheck?: () => Promise<boolean>;
  /** When provided, cache misses enqueue a pipeline job instead of running synchronously. */
  queue?: Queue;
}

export interface GetDependentsResult {
  repos: ScoredRepo[] | null;
  fromCache: boolean;
  refreshing: boolean;
  dependentCount?: number;
  pending?: boolean;
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

  if (options.existenceCheck) {
    const exists = await options.existenceCheck();
    if (!exists) {
      logger?.log('cache', 'package does not exist, skipping pipeline');
      return { repos: null, fromCache: false, refreshing: false };
    }
  }

  if (options.queue) {
    const lockKey = buildLockKey(key);
    const existing = await kv.get(lockKey);

    // KV doesn't support atomic check-and-set, so concurrent requests may
    // both pass this check and enqueue duplicate messages. This is harmless:
    // the consumer is idempotent (writes the same result to the same key).
    //
    // If the queue consumer fails permanently, the pending KV entry persists
    // but self-heals: the lock expires after LOCK_TTL_SECONDS (5 min), so
    // the next visitor will see a cache miss and re-enqueue.
    if (existing === null) {
      const pendingEntry: CacheEntry = {
        repos: [],
        fetchedAt: (now ?? new Date()).toISOString(),
        lastAccessedAt: (now ?? new Date()).toISOString(),
        partial: true,
        pending: true,
      };
      await writeCache(kv, key, pendingEntry);
      await kv.put(lockKey, '1', { expirationTtl: LOCK_TTL_SECONDS });
      await options.queue.send({
        platform: strategy.platform,
        packageName,
        enqueuedAt: (now ?? new Date()).toISOString(),
      });
    }

    return {
      repos: [],
      fromCache: false,
      refreshing: false,
      pending: true,
    };
  }

  const entry = await refreshDependents(
    strategy,
    packageName,
    env,
    now,
    logger,
    limits
  );
  await writeCache(kv, key, entry);
  waitUntil(appendSnapshot(kv, key, entry, now));

  return {
    repos: entry.repos,
    fromCache: false,
    refreshing: false,
    dependentCount: entry.dependentCount,
  };
}

export interface GetBadgeCountResult {
  count: number | null;
  fromCache: boolean;
}

function extractCount(entry: CacheEntry): number | null {
  if (entry.dependentCount != null) {
    return entry.dependentCount;
  }

  if (!entry.countOnly) {
    return entry.repos.length;
  }

  return null;
}

export async function getDependentCountForBadge(
  options: GetDependentsOptions
): Promise<GetBadgeCountResult> {
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

  if (cached.status === 'hit') {
    waitUntil(touchLastAccessed(kv, key, cached.entry, now));

    return { count: extractCount(cached.entry), fromCache: true };
  }

  if (cached.status === 'stale') {
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

    return { count: extractCount(cached.entry), fromCache: true };
  }

  logger?.log('cache', 'miss (badge)');
  const entry = await refreshCountOnly(strategy, packageName, now, logger);
  await writeCache(kv, key, entry);

  return { count: entry.dependentCount ?? null, fromCache: false };
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
    const entry = staleEntry.countOnly
      ? await refreshCountOnly(strategy, packageName, now)
      : await refreshDependents(
          strategy,
          packageName,
          env,
          now,
          undefined,
          limits
        );
    await writeCache(kv, key, entry);
    await appendSnapshot(kv, key, entry, now);
  } catch (error) {
    // Refresh failed — still bump lastAccessedAt so the entry isn't
    // evicted while it's actively being served to users
    await touchLastAccessed(kv, key, staleEntry, now);
    console.error('Background refresh failed:', error);
  } finally {
    await kv.delete(lockKey);
  }
}
