import { FRESH_TTL_MS, writeCache } from '../cache/cache';
import { parseCacheKey } from '../cache/parse-cache-key';
import type { CacheEntry, CacheMetadata } from '../cache/types';
import { refreshDependents } from '../github/pipeline';
import {
  isRateLimitError,
  isSecondaryRateLimitError,
} from '../github/rate-limit';

const MAX_REFRESHES_PER_RUN = 5;
const PARTIAL_FRESH_TTL_MS = 12 * 60 * 60 * 1000;

export interface ScheduledRefreshResult {
  keysScanned: number;
  refreshed: number;
  skipped: number;
  errors: number;
  abortedDueToRateLimit: boolean;
}

interface StaleEntry {
  key: string;
  packageName: string;
  fetchedAt: number;
  partial: boolean;
}

export async function runScheduledRefresh(
  env: { DEPENDENTS_CACHE: KVNamespace; GITHUB_TOKEN: string },
  now: Date = new Date()
): Promise<ScheduledRefreshResult> {
  const kv = env.DEPENDENTS_CACHE;
  const nowMs = now.getTime();

  // Scan all keys with cursor pagination
  const staleEntries: StaleEntry[] = [];
  let keysScanned = 0;
  let cursor: string | undefined;

  do {
    const listResult = await kv.list<CacheMetadata>({
      cursor,
    });

    for (const key of listResult.keys) {
      keysScanned++;

      let fetchedAt: number;
      let partial: boolean;

      if (key.metadata) {
        fetchedAt = new Date(key.metadata.fetchedAt).getTime();
        partial = key.metadata.partial;
      } else {
        // Legacy entry without metadata — fall back to reading the value
        const raw = await kv.get(key.name);

        if (raw === null) {
          continue;
        }

        const entry: CacheEntry = JSON.parse(raw);
        fetchedAt = new Date(entry.fetchedAt).getTime();
        partial = entry.partial;
      }

      const age = nowMs - fetchedAt;
      const threshold = partial ? PARTIAL_FRESH_TTL_MS : FRESH_TTL_MS;

      if (age >= threshold) {
        const parsed = parseCacheKey(key.name);

        if (parsed) {
          staleEntries.push({
            key: key.name,
            packageName: parsed.packageName,
            fetchedAt,
            partial,
          });
        }
      }
    }

    cursor = listResult.list_complete ? undefined : listResult.cursor;
  } while (cursor);

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
      const entry = await refreshDependents(
        staleEntry.packageName,
        { GITHUB_TOKEN: env.GITHUB_TOKEN },
        now
      );
      await writeCache(kv, staleEntry.key, entry);
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
    skipped: keysScanned - staleEntries.length,
    errors,
    abortedDueToRateLimit,
  };
}
