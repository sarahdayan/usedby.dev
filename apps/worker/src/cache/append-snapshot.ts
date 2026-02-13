import type { CacheEntry, HistoryEntry, HistorySnapshot } from './types';

const MAX_SNAPSHOTS = 365;
const HISTORY_KEY_PREFIX = 'history:';

export function buildHistoryKey(cacheKey: string): string {
  return `${HISTORY_KEY_PREFIX}${cacheKey}`;
}

export function isHistoryKey(key: string): boolean {
  return key.startsWith(HISTORY_KEY_PREFIX);
}

export function buildSnapshot(
  entry: CacheEntry,
  now: Date = new Date()
): HistorySnapshot {
  const date = now.toISOString().slice(0, 10);
  const repoCount = entry.repos.length;
  const dependentCount = entry.dependentCount ?? repoCount;

  const versionDistribution: Record<string, number> = {};

  for (const repo of entry.repos) {
    if (repo.version) {
      versionDistribution[repo.version] =
        (versionDistribution[repo.version] ?? 0) + 1;
    }
  }

  return {
    date,
    dependentCount,
    repoCount,
    ...(Object.keys(versionDistribution).length > 0 && {
      versionDistribution,
    }),
  };
}

export async function appendSnapshot(
  kv: KVNamespace,
  cacheKey: string,
  entry: CacheEntry,
  now: Date = new Date()
): Promise<void> {
  if (entry.countOnly) {
    return;
  }

  const historyKey = buildHistoryKey(cacheKey);
  const raw = await kv.get(historyKey);
  const history: HistoryEntry = raw ? JSON.parse(raw) : { snapshots: [] };

  const snapshot = buildSnapshot(entry, now);

  // Deduplicate by date — replace if same day already exists
  const existingIndex = history.snapshots.findIndex(
    (s) => s.date === snapshot.date
  );

  if (existingIndex !== -1) {
    history.snapshots[existingIndex] = snapshot;
  } else {
    history.snapshots.push(snapshot);
  }

  // Cap at MAX_SNAPSHOTS, keeping the most recent
  if (history.snapshots.length > MAX_SNAPSHOTS) {
    history.snapshots = history.snapshots.slice(-MAX_SNAPSHOTS);
  }

  await kv.put(historyKey, JSON.stringify(history));
}
