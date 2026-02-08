import { Octokit } from '@octokit/rest';

import type { DevLogger } from '../dev-logger';
import type { DependentRepo, EnrichResult } from './types';

const BATCH_SIZE = 50;

export async function enrichRepos(
  repos: DependentRepo[],
  env: { GITHUB_TOKEN: string },
  logger?: DevLogger
): Promise<EnrichResult> {
  if (repos.length === 0) {
    return { repos: [], rateLimited: false };
  }

  const octokit = new Octokit({ auth: env.GITHUB_TOKEN });
  const enriched: DependentRepo[] = [];

  for (let i = 0; i < repos.length; i += BATCH_SIZE) {
    const batch = repos.slice(i, i + BATCH_SIZE);
    const query = buildGraphQLQuery(batch);

    let data: Record<string, GraphQLRepoResult | null>;

    try {
      data =
        await octokit.graphql<Record<string, GraphQLRepoResult | null>>(query);
    } catch (error) {
      if (isGraphQLRateLimited(error)) {
        console.log(
          `[enrichRepos] Rate limited after ${enriched.length} results, returning partial data`
        );

        return { repos: enriched, rateLimited: true };
      }

      throw error;
    }

    for (let j = 0; j < batch.length; j++) {
      const result = data[`repo_${j}`];

      if (result == null) {
        continue;
      }

      const repo = batch[j]!;

      enriched.push({
        ...repo,
        stars: result.stargazerCount,
        lastPush: result.pushedAt ?? '',
        avatarUrl: result.owner.avatarUrl,
        isFork: result.isFork,
        archived: result.isArchived,
      });
    }
  }

  const batchCount = Math.ceil(repos.length / BATCH_SIZE);
  const nullSkipped = repos.length - enriched.length;
  logger?.log(
    'enrich',
    `${repos.length} \u2192 ${enriched.length} (${batchCount} batches${nullSkipped > 0 ? `, ${nullSkipped} null` : ''})`
  );

  return { repos: enriched, rateLimited: false };
}

interface GraphQLRepoResult {
  stargazerCount: number;
  isArchived: boolean;
  isFork: boolean;
  pushedAt: string | null;
  owner: { avatarUrl: string };
}

function buildGraphQLQuery(repos: DependentRepo[]): string {
  const fragments = repos.map((repo, i) => {
    const owner = repo.owner.replace(/[^a-zA-Z0-9_.-]/g, '');
    const name = repo.name.replace(/[^a-zA-Z0-9_.-]/g, '');

    return `repo_${i}: repository(owner: "${owner}", name: "${name}") {
      stargazerCount
      isArchived
      isFork
      pushedAt
      owner { avatarUrl }
    }`;
  });

  return `{ ${fragments.join('\n')} }`;
}

function isGraphQLRateLimited(error: unknown): boolean {
  if (
    error != null &&
    typeof error === 'object' &&
    'status' in error &&
    (error.status === 403 || error.status === 429)
  ) {
    return true;
  }

  if (
    error != null &&
    typeof error === 'object' &&
    'errors' in error &&
    Array.isArray((error as { errors: unknown[] }).errors)
  ) {
    return (error as { errors: Array<{ type?: string }> }).errors.some(
      (e) => e.type === 'RATE_LIMITED'
    );
  }

  return false;
}
