import {
  appendSnapshot,
  buildHistoryKey,
  isHistoryKey,
} from '../cache/append-snapshot';
import { FRESH_TTL_MS, writeCache } from '../cache/cache';
import { parseCacheKey } from '../cache/parse-cache-key';
import type { CacheMetadata } from '../cache/types';
import { getStrategy } from '../ecosystems';
import type { EcosystemStrategy } from '../ecosystems/strategy';
import { refreshCountOnly, refreshDependents } from '../github/pipeline';
import { PROD_LIMITS } from '../github/pipeline-limits';
import {
  isRateLimitError,
  isSecondaryRateLimitError,
} from '../github/rate-limit';

const MAX_REFRESHES_PER_RUN = 5;
const PARTIAL_FRESH_TTL_MS = 12 * 60 * 60 * 1000;
export const EVICTION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface ScheduledRefreshResult {
  keysScanned: number;
  refreshed: number;
  skipped: number;
  evicted: number;
  errors: number;
  abortedDueToRateLimit: boolean;
}

interface StaleEntry {
  key: string;
  packageName: string;
  strategy: EcosystemStrategy;
  fetchedAt: number;
  partial: boolean;
  lastAccessedAt: string;
  countOnly: boolean;
}

export async function runScheduledRefresh(
  env: { DEPENDENTS_CACHE: KVNamespace; GITHUB_TOKEN: string },
  now: Date = new Date()
): Promise<ScheduledRefreshResult> {
  const kv = env.DEPENDENTS_CACHE;
  const nowMs = now.getTime();

  // Scan all keys with cursor pagination
  const staleEntries: StaleEntry[] = [];
  const inactiveKeys: string[] = [];
  let keysScanned = 0;
  let cursor: string | undefined;

  do {
    const listResult = await kv.list<CacheMetadata>({
      cursor,
    });

    for (const key of listResult.keys) {
      if (isHistoryKey(key.name)) {
        continue;
      }

      keysScanned++;

      if (!key.metadata) {
        continue;
      }

      const fetchedAt = new Date(key.metadata.fetchedAt).getTime();
      const partial = key.metadata.partial;
      const lastAccessedAtMs = new Date(key.metadata.lastAccessedAt).getTime();
      const lastAccessedAtIso = key.metadata.lastAccessedAt;

      // Inactive entries: not accessed in 30+ days → evict
      if (nowMs - lastAccessedAtMs >= EVICTION_TTL_MS) {
        inactiveKeys.push(key.name);
        continue;
      }

      const age = nowMs - fetchedAt;
      const threshold = partial ? PARTIAL_FRESH_TTL_MS : FRESH_TTL_MS;

      if (age >= threshold) {
        const parsed = parseCacheKey(key.name);

        if (parsed) {
          const strategy = getStrategy(parsed.platform);

          if (strategy) {
            staleEntries.push({
              key: key.name,
              packageName: parsed.packageName,
              strategy,
              fetchedAt,
              partial,
              lastAccessedAt: lastAccessedAtIso,
              countOnly: key.metadata.countOnly === true,
            });
          }
        }
      }
    }

    cursor = listResult.list_complete ? undefined : listResult.cursor;
  } while (cursor);

  // Evict inactive entries and their history
  for (const key of inactiveKeys) {
    await kv.delete(key);
    await kv.delete(buildHistoryKey(key));
  }

  // Sort: partial entries first, then oldest first
  staleEntries.sort((a, b) => {
    if (a.partial !== b.partial) {
      return a.partial ? -1 : 1;
    }

    return a.fetchedAt - b.fetchedAt;
  });

  // Refresh up to MAX_REFRESHES_PER_RUN entries
  let refreshed = 0;
  let errors = 0;
  let abortedDueToRateLimit = false;

  for (const staleEntry of staleEntries.slice(0, MAX_REFRESHES_PER_RUN)) {
    try {
      const entry = staleEntry.countOnly
        ? await refreshCountOnly(
            staleEntry.strategy,
            staleEntry.packageName,
            now
          )
        : await refreshDependents(
            staleEntry.strategy,
            staleEntry.packageName,
            { GITHUB_TOKEN: env.GITHUB_TOKEN },
            now,
            undefined,
            PROD_LIMITS
          );
      // Preserve the original lastAccessedAt so cron refreshes don't reset
      // the eviction clock — only real user requests should extend it
      entry.lastAccessedAt = staleEntry.lastAccessedAt;
      await writeCache(kv, staleEntry.key, entry);
      await appendSnapshot(kv, staleEntry.key, entry, now);
      refreshed++;
    } catch (error) {
      if (isRateLimitError(error) || isSecondaryRateLimitError(error)) {
        abortedDueToRateLimit = true;
        break;
      }

      console.error(`[scheduled] Failed to refresh ${staleEntry.key}:`, error);
      errors++;
    }
  }

  return {
    keysScanned,
    refreshed,
    skipped: keysScanned - staleEntries.length - inactiveKeys.length,
    evicted: inactiveKeys.length,
    errors,
    abortedDueToRateLimit,
  };
}
