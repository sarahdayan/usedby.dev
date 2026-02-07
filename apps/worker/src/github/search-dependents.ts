import { Octokit } from '@octokit/rest';

import type { DependentRepo } from './types';

export async function searchDependents(
  packageName: string,
  env: { GITHUB_TOKEN: string }
): Promise<DependentRepo[]> {
  const octokit = new Octokit({ auth: env.GITHUB_TOKEN });

  const items = await octokit.paginate(octokit.rest.search.code, {
    q: `"${packageName}" filename:package.json`,
    per_page: 100,
  });

  const seen = new Set<string>();
  const repos: DependentRepo[] = [];

  for (const item of items) {
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
    });
  }

  return repos;
}
