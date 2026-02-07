import { RequestError } from '@octokit/request-error';
import { Octokit } from '@octokit/rest';

import {
  getRetryAfter,
  getRetryDelay,
  getRateLimitReset,
  isRateLimitError,
  isSecondaryRateLimitError,
  sleep,
} from './rate-limit';
import type { DependentRepo, EnrichResult } from './types';

// Keep batches small to avoid triggering GitHub's secondary rate limit
// (~100 requests/minute for the REST API).
const BATCH_SIZE = 10;
const MAX_RETRIES = 3;

export async function enrichRepos(
  repos: DependentRepo[],
  env: { GITHUB_TOKEN: string }
): Promise<EnrichResult> {
  if (repos.length === 0) {
    return { repos: [], rateLimited: false };
  }

  const octokit = new Octokit({ auth: env.GITHUB_TOKEN });
  const enriched: DependentRepo[] = [];

  for (let i = 0; i < repos.length; i += BATCH_SIZE) {
    const batch = repos.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((repo) => enrichOneRepo(octokit, repo))
    );

    // Two-pass processing: surface non-rate-limit errors before handling
    // rate limits, so genuine failures (e.g. 500s) are never silently swallowed.
    let hitRateLimit = false;

    for (const result of results) {
      if (result.status === 'rejected') {
        const error = result.reason;

        if (isRateLimitError(error) || isSecondaryRateLimitError(error)) {
          hitRateLimit = true;
        } else {
          throw error;
        }
      }
    }

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value !== null) {
        enriched.push(result.value);
      }
    }

    if (hitRateLimit) {
      console.log(
        `[enrichRepos] Rate limited after ${enriched.length} results, returning partial data`
      );

      return { repos: enriched, rateLimited: true };
    }
  }

  return { repos: enriched, rateLimited: false };
}

async function enrichOneRepo(
  octokit: Octokit,
  repo: DependentRepo
): Promise<DependentRepo | null> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await octokit.rest.repos.get({
        owner: repo.owner,
        repo: repo.name,
      });

      return {
        ...repo,
        stars: response.data.stargazers_count,
        lastPush: response.data.pushed_at ?? '',
        avatarUrl: response.data.owner.avatar_url,
        isFork: response.data.fork,
        archived: response.data.archived,
      };
    } catch (error) {
      if (error instanceof RequestError && error.status === 404) {
        return null;
      }

      const isRateLimit =
        isRateLimitError(error) || isSecondaryRateLimitError(error);

      if (!isRateLimit) {
        throw error;
      }

      if (attempt === MAX_RETRIES - 1) {
        throw error;
      }

      const retryAfterMs = getRetryAfter(error);
      const delay =
        retryAfterMs ?? getRetryDelay(attempt, getRateLimitReset(error));

      console.log(
        `[enrichRepos] Rate limited on ${repo.fullName}, retrying in ${Math.round(delay / 1000)}s (attempt ${attempt + 1}/${MAX_RETRIES})`
      );

      await sleep(delay);
    }
  }

  // Unreachable (the loop always returns or throws)
  throw new Error('enrichOneRepo: unexpected loop exit');
}
