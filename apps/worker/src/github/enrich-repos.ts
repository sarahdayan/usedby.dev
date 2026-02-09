import { Octokit } from '@octokit/rest';

import type { DevLogger } from '../dev-logger';
import type { PipelineLimits } from './pipeline-limits';
import { PAID_LIMITS } from './pipeline-limits';
import type { DependentRepo, EnrichResult } from './types';

export async function enrichRepos(
  repos: DependentRepo[],
  packageName: string,
  env: { GITHUB_TOKEN: string },
  logger?: DevLogger,
  limits: PipelineLimits = PAID_LIMITS
): Promise<EnrichResult> {
  if (repos.length === 0) {
    return { repos: [], rateLimited: false };
  }

  const octokit = new Octokit({ auth: env.GITHUB_TOKEN });
  const enriched: DependentRepo[] = [];
  const nullRepos: string[] = [];
  const falsePositives: string[] = [];

  // Split repos into batches
  const batches: DependentRepo[][] = [];
  for (let i = 0; i < repos.length; i += limits.batchSize) {
    batches.push(repos.slice(i, i + limits.batchSize));
  }

  const concurrency = limits.enrichConcurrency;
  let rateLimited = false;

  // Process batches in concurrent waves
  for (let i = 0; i < batches.length; i += concurrency) {
    if (rateLimited) break;

    const wave = batches.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      wave.map((batch) => enrichBatch(octokit, batch, packageName))
    );

    // Collect successes and classify failures before deciding action.
    // This prevents a non-rate-limit error from masking a rate limit
    // (or vice versa) when multiple batches in a wave fail concurrently.
    let unknownError: unknown = null;

    for (const result of results) {
      if (result.status === 'fulfilled') {
        enriched.push(...result.value.enriched);
        nullRepos.push(...result.value.nullRepos);
        falsePositives.push(...result.value.falsePositives);
      } else if (isGraphQLRateLimited(result.reason)) {
        rateLimited = true;
      } else {
        unknownError = result.reason;
      }
    }

    if (unknownError && !rateLimited) {
      throw unknownError;
    }

    if (rateLimited) {
      console.log(
        `[enrichRepos] Rate limited after ${enriched.length} results, returning partial data`
      );
    }
  }

  const details: string[] = [`${batches.length} batches`];
  if (nullRepos.length > 0) details.push(`${nullRepos.length} null`);
  if (falsePositives.length > 0)
    details.push(`${falsePositives.length} false positives`);
  logger?.log(
    'enrich',
    `${repos.length} \u2192 ${enriched.length} (${details.join(', ')})`
  );
  if (nullRepos.length > 0) logger?.log('  null', nullRepos.join(', '));
  if (falsePositives.length > 0)
    logger?.log('  false+', falsePositives.join(', '));

  return { repos: enriched, rateLimited };
}

interface BatchResult {
  enriched: DependentRepo[];
  nullRepos: string[];
  falsePositives: string[];
}

async function enrichBatch(
  octokit: Octokit,
  batch: DependentRepo[],
  packageName: string
): Promise<BatchResult> {
  const { query, variables } = buildGraphQLQuery(batch);
  const data = await octokit.graphql<Record<string, GraphQLRepoResult | null>>(
    query,
    variables
  );

  const enriched: DependentRepo[] = [];
  const nullRepos: string[] = [];
  const falsePositives: string[] = [];

  for (let j = 0; j < batch.length; j++) {
    const result = data[`repo_${j}`];

    if (result == null) {
      nullRepos.push(batch[j]!.fullName);
      continue;
    }

    if (!isDependency(result.packageJson, packageName)) {
      falsePositives.push(batch[j]!.fullName);
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

  return { enriched, nullRepos, falsePositives };
}

interface GraphQLRepoResult {
  stargazerCount: number;
  isArchived: boolean;
  isFork: boolean;
  pushedAt: string | null;
  owner: { avatarUrl: string };
  packageJson: { text: string } | null;
}

function buildGraphQLQuery(repos: DependentRepo[]): {
  query: string;
  variables: Record<string, string>;
} {
  const variables: Record<string, string> = {};

  const varDeclarations = repos
    .map(
      (_, i) => `$owner_${i}: String!, $name_${i}: String!, $expr_${i}: String!`
    )
    .join(', ');

  const fragments = repos.map((repo, i) => {
    variables[`owner_${i}`] = repo.owner;
    variables[`name_${i}`] = repo.name;
    variables[`expr_${i}`] = `HEAD:${repo.packageJsonPath}`;

    return `repo_${i}: repository(owner: $owner_${i}, name: $name_${i}) {
      stargazerCount
      isArchived
      isFork
      pushedAt
      owner { avatarUrl }
      packageJson: object(expression: $expr_${i}) { ... on Blob { text } }
    }`;
  });

  return {
    query: `query(${varDeclarations}) { ${fragments.join('\n')} }`,
    variables,
  };
}

const DEP_KEYS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] as const;

function isDependency(
  packageJson: { text: string } | null,
  packageName: string
): boolean {
  if (packageJson?.text == null) return false;

  try {
    const parsed = JSON.parse(packageJson.text) as Record<string, unknown>;

    for (const key of DEP_KEYS) {
      const deps = parsed[key];

      if (deps != null && typeof deps === 'object' && packageName in deps) {
        return true;
      }
    }
  } catch {
    // Malformed JSON — treat as false positive
  }

  return false;
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
