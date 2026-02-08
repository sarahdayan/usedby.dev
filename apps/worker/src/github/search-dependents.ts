import { Octokit } from '@octokit/rest';

import type { DevLogger } from '../dev-logger';
import type { PipelineLimits } from './pipeline-limits';
import { PROD_LIMITS } from './pipeline-limits';
import {
  getRetryAfter,
  getRetryDelay,
  getRateLimitReset,
  isRateLimitError,
  isSecondaryRateLimitError,
  sleep,
} from './rate-limit';
import type { DependentRepo, SearchResult } from './types';

const PER_PAGE = 100;
const MAX_RETRIES = 3;

export async function searchDependents(
  packageName: string,
  env: { GITHUB_TOKEN: string },
  logger?: DevLogger,
  limits: PipelineLimits = PROD_LIMITS
): Promise<SearchResult> {
  const octokit = new Octokit({ auth: env.GITHUB_TOKEN });

  const seen = new Set<string>();
  const repos: DependentRepo[] = [];
  let hitPageCap = false;
  let pagesFetched = 0;

  for (let page = 1; page <= limits.maxPages; page++) {
    let response;

    try {
      response = await fetchPageWithRetry(octokit, packageName, page);
    } catch (error) {
      if (isRateLimitError(error) || isSecondaryRateLimitError(error)) {
        console.log(
          `[searchDependents] Rate limited after ${repos.length} results, returning partial data`
        );

        return { repos, partial: true, rateLimited: true, capped: false };
      }

      throw error;
    }

    pagesFetched++;

    for (const item of response.data.items) {
      const repo = item.repository;
      const fullName = repo.full_name;

      if (seen.has(fullName)) {
        continue;
      }

      seen.add(fullName);
      repos.push({
        owner: repo.owner.login,
        name: repo.name,
        fullName,
        stars: repo.stargazers_count ?? 0,
        lastPush: repo.pushed_at ?? '',
        avatarUrl: repo.owner.avatar_url,
        isFork: repo.fork,
        archived: false,
        packageJsonPath: item.path,
      });
    }

    if (response.data.items.length < PER_PAGE) {
      break;
    }

    if (page === limits.maxPages) {
      hitPageCap = true;
    } else {
      await sleep(limits.pageDelayMs);
    }
  }

  const flags = [hitPageCap && 'capped'].filter(Boolean).join(', ');
  logger?.log(
    'search',
    `${repos.length} repos (${pagesFetched} pages${flags ? `, ${flags}` : ''})`
  );

  return { repos, partial: false, rateLimited: false, capped: hitPageCap };
}

async function fetchPageWithRetry(
  octokit: Octokit,
  packageName: string,
  page: number
) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await octokit.rest.search.code({
        q: `"${packageName}" filename:package.json`,
        per_page: PER_PAGE,
        page,
      });
    } catch (error) {
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
        `[searchDependents] Rate limited on page ${page}, retrying in ${Math.round(delay / 1000)}s (attempt ${attempt + 1}/${MAX_RETRIES})`
      );

      await sleep(delay);
    }
  }

  // Unreachable — the loop always returns or throws
  throw new Error('fetchPageWithRetry: unexpected loop exit');
}
