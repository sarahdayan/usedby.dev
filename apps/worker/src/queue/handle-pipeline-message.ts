import { appendSnapshot } from '../cache/append-snapshot';
import { buildCacheKey, writeCache } from '../cache/cache';
import { buildLockKey } from '../cache/get-dependents';
import { getStrategy } from '../ecosystems';
import { refreshDependents } from '../github/pipeline';
import { PAID_LIMITS } from '../github/pipeline-limits';
import type { PipelineMessage } from './types';

interface HandleEnv {
  DEPENDENTS_CACHE: KVNamespace;
  GITHUB_TOKEN: string;
}

export async function handlePipelineMessage(
  message: PipelineMessage,
  env: HandleEnv
): Promise<void> {
  const { platform, packageName } = message;
  const strategy = getStrategy(platform);

  if (!strategy) {
    console.error(
      `[queue] Unknown platform "${platform}" for ${packageName}, skipping`
    );
    return;
  }

  const kv = env.DEPENDENTS_CACHE;
  const key = buildCacheKey(platform, packageName);
  const lockKey = buildLockKey(key);

  try {
    const entry = await refreshDependents(
      strategy,
      packageName,
      { GITHUB_TOKEN: env.GITHUB_TOKEN },
      undefined,
      undefined,
      PAID_LIMITS
    );
    await writeCache(kv, key, entry);
    await appendSnapshot(kv, key, entry);
  } finally {
    await kv.delete(lockKey);
  }
}
