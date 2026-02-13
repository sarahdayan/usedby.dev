import type { CacheEntry, CacheMetadata, CacheResult } from './types';

export const FRESH_TTL_MS = 24 * 60 * 60 * 1000;

export function buildCacheKey(platform: string, packageName: string): string {
  return `${platform}:${packageName}`;
}

export async function readCache(
  kv: KVNamespace,
  key: string,
  now: Date = new Date()
): Promise<CacheResult> {
  const raw = await kv.get(key);

  if (raw === null) {
    return { status: 'miss', entry: null };
  }

  const entry: CacheEntry = JSON.parse(raw);

  if (entry.pending) {
    return { status: 'miss', entry: null };
  }

  const age = now.getTime() - new Date(entry.fetchedAt).getTime();

  if (age < FRESH_TTL_MS) {
    return { status: 'hit', entry };
  }

  return { status: 'stale', entry };
}

function buildMetadata(entry: CacheEntry): CacheMetadata {
  return {
    fetchedAt: entry.fetchedAt,
    lastAccessedAt: entry.lastAccessedAt,
    partial: entry.partial,
    ...(entry.countOnly && { countOnly: true }),
    ...(entry.pending && { pending: true }),
  };
}

export async function writeCache(
  kv: KVNamespace,
  key: string,
  entry: CacheEntry
): Promise<void> {
  await kv.put(key, JSON.stringify(entry), {
    metadata: buildMetadata(entry),
  });
}

export async function touchLastAccessed(
  kv: KVNamespace,
  key: string,
  entry: CacheEntry,
  now: Date = new Date()
): Promise<void> {
  const updated: CacheEntry = {
    ...entry,
    lastAccessedAt: now.toISOString(),
  };

  await kv.put(key, JSON.stringify(updated), {
    metadata: buildMetadata(updated),
  });
}
