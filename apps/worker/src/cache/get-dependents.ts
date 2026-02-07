import type { ScoredRepo } from '../github/types';
import { refreshDependents } from '../github/pipeline';
import {
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
}

export interface GetDependentsResult {
  repos: ScoredRepo[];
  fromCache: boolean;
  refreshing: boolean;
}

export async function getDependents(
  options: GetDependentsOptions
): Promise<GetDependentsResult> {
  const { platform, packageName, kv, env, waitUntil, now } = options;
  const key = buildCacheKey(platform, packageName);
  const cached = await readCache(kv, key, now);

  if (cached.status === 'hit') {
    waitUntil(touchLastAccessed(kv, key, cached.entry, now));

    return { repos: cached.entry.repos, fromCache: true, refreshing: false };
  }

  if (cached.status === 'stale') {
    waitUntil(backgroundRefresh(packageName, env, kv, key, now));

    return { repos: cached.entry.repos, fromCache: true, refreshing: true };
  }

  const entry = await refreshDependents(packageName, env, now);
  await writeCache(kv, key, entry);

  return { repos: entry.repos, fromCache: false, refreshing: false };
}

async function backgroundRefresh(
  packageName: string,
  env: { GITHUB_TOKEN: string },
  kv: KVNamespace,
  key: string,
  now?: Date
): Promise<void> {
  try {
    const entry = await refreshDependents(packageName, env, now);
    await writeCache(kv, key, entry);
  } catch (error) {
    console.error('Background refresh failed:', error);
  }
}
