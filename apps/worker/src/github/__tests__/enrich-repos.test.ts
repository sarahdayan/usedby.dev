import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { enrichRepos } from '../enrich-repos';
import type { DependentRepo } from '../types';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('enrichRepos', () => {
  it('enriches repos with accurate metadata', async () => {
    server.use(
      http.post('https://api.github.com/graphql', () => {
        return HttpResponse.json({
          data: {
            repo_0: createGraphQLRepo({
              stargazerCount: 5000,
              pushedAt: '2025-06-01T00:00:00Z',
              avatarUrl: 'https://avatars.githubusercontent.com/u/99',
              isFork: false,
              isArchived: false,
            }),
            repo_1: createGraphQLRepo({
              stargazerCount: 1200,
              pushedAt: '2025-05-15T00:00:00Z',
              avatarUrl: 'https://avatars.githubusercontent.com/u/42',
              isFork: true,
              isArchived: true,
            }),
          },
        });
      })
    );

    const result = await enrichRepos(
      [createSkeletonRepo('acme/app'), createSkeletonRepo('corp/lib')],
      'my-package',
      { GITHUB_TOKEN: 'fake-token' }
    );

    expect(result.rateLimited).toBe(false);
    expect(result.repos).toEqual([
      {
        owner: 'acme',
        name: 'app',
        fullName: 'acme/app',
        stars: 5000,
        lastPush: '2025-06-01T00:00:00Z',
        avatarUrl: 'https://avatars.githubusercontent.com/u/99',
        isFork: false,
        archived: false,
        packageJsonPath: 'package.json',
      },
      {
        owner: 'corp',
        name: 'lib',
        fullName: 'corp/lib',
        stars: 1200,
        lastPush: '2025-05-15T00:00:00Z',
        avatarUrl: 'https://avatars.githubusercontent.com/u/42',
        isFork: true,
        archived: true,
        packageJsonPath: 'package.json',
      },
    ]);
  });

  it('skips null repos (deleted/private)', async () => {
    server.use(
      http.post('https://api.github.com/graphql', () => {
        return HttpResponse.json({
          data: {
            repo_0: createGraphQLRepo({ stargazerCount: 500 }),
            repo_1: null,
          },
        });
      })
    );

    const result = await enrichRepos(
      [createSkeletonRepo('acme/app'), createSkeletonRepo('deleted/repo')],
      'my-package',
      { GITHUB_TOKEN: 'fake-token' }
    );

    expect(result.repos).toHaveLength(1);
    expect(result.repos[0]!.fullName).toBe('acme/app');
    expect(result.rateLimited).toBe(false);
  });

  it('handles empty input', async () => {
    const result = await enrichRepos([], 'my-package', {
      GITHUB_TOKEN: 'fake-token',
    });

    expect(result.repos).toEqual([]);
    expect(result.rateLimited).toBe(false);
  });

  it('processes multiple batches (>50 repos)', async () => {
    let requestCount = 0;

    server.use(
      http.post('https://api.github.com/graphql', async ({ request }) => {
        requestCount++;
        const body = (await request.json()) as { query: string };

        const data: Record<string, object> = {};
        const matches = body.query.matchAll(/repo_(\d+)/g);

        for (const match of matches) {
          const idx = match[1];
          data[`repo_${idx}`] = createGraphQLRepo({ stargazerCount: 100 });
        }

        return HttpResponse.json({ data });
      })
    );

    const repos = Array.from({ length: 75 }, (_, i) =>
      createSkeletonRepo(`org/repo-${i}`)
    );

    const result = await enrichRepos(repos, 'my-package', {
      GITHUB_TOKEN: 'fake-token',
    });

    expect(requestCount).toBe(2);
    expect(result.repos).toHaveLength(75);
    expect(result.rateLimited).toBe(false);
  });

  it('returns partial results on rate limit (RATE_LIMITED error type)', async () => {
    let requestCount = 0;

    server.use(
      http.post('https://api.github.com/graphql', () => {
        requestCount++;

        if (requestCount === 1) {
          const data: Record<string, object> = {};

          for (let i = 0; i < 50; i++) {
            data[`repo_${i}`] = createGraphQLRepo({ stargazerCount: 100 });
          }

          return HttpResponse.json({ data });
        }

        return HttpResponse.json({
          errors: [{ type: 'RATE_LIMITED', message: 'rate limited' }],
        });
      })
    );

    const repos = Array.from({ length: 75 }, (_, i) =>
      createSkeletonRepo(`org/repo-${i}`)
    );

    const result = await enrichRepos(repos, 'my-package', {
      GITHUB_TOKEN: 'fake-token',
    });

    expect(result.repos).toHaveLength(50);
    expect(result.rateLimited).toBe(true);
  });

  it('returns partial results on HTTP 403 rate limit', async () => {
    server.use(
      http.post('https://api.github.com/graphql', () => {
        return HttpResponse.json(
          { message: 'rate limit exceeded' },
          { status: 403 }
        );
      })
    );

    const result = await enrichRepos(
      [createSkeletonRepo('acme/app')],
      'my-package',
      { GITHUB_TOKEN: 'fake-token' }
    );

    expect(result.repos).toHaveLength(0);
    expect(result.rateLimited).toBe(true);
  });

  it('returns partial results on HTTP 429 rate limit', async () => {
    server.use(
      http.post('https://api.github.com/graphql', () => {
        return HttpResponse.json(
          { message: 'too many requests' },
          { status: 429 }
        );
      })
    );

    const result = await enrichRepos(
      [createSkeletonRepo('acme/app')],
      'my-package',
      { GITHUB_TOKEN: 'fake-token' }
    );

    expect(result.repos).toHaveLength(0);
    expect(result.rateLimited).toBe(true);
  });

  it('throws on non-rate-limit errors', async () => {
    server.use(
      http.post('https://api.github.com/graphql', () => {
        return HttpResponse.json(
          { message: 'Internal Server Error' },
          { status: 500 }
        );
      })
    );

    await expect(
      enrichRepos([createSkeletonRepo('acme/app')], 'my-package', {
        GITHUB_TOKEN: 'fake-token',
      })
    ).rejects.toThrow();
  });

  it('filters out repos where package is not an actual dependency', async () => {
    server.use(
      http.post('https://api.github.com/graphql', () => {
        return HttpResponse.json({
          data: {
            repo_0: createGraphQLRepo({
              stargazerCount: 500,
              packageJson: {
                text: JSON.stringify({
                  dependencies: { 'my-package': '^1.0.0' },
                }),
              },
            }),
            repo_1: createGraphQLRepo({
              stargazerCount: 300,
              packageJson: {
                text: JSON.stringify({
                  description: 'Mentions my-package in description only',
                }),
              },
            }),
          },
        });
      })
    );

    const result = await enrichRepos(
      [createSkeletonRepo('acme/app'), createSkeletonRepo('noise/repo')],
      'my-package',
      { GITHUB_TOKEN: 'fake-token' }
    );

    expect(result.repos).toHaveLength(1);
    expect(result.repos[0]!.fullName).toBe('acme/app');
  });

  it('accepts packages in devDependencies and peerDependencies', async () => {
    server.use(
      http.post('https://api.github.com/graphql', () => {
        return HttpResponse.json({
          data: {
            repo_0: createGraphQLRepo({
              packageJson: {
                text: JSON.stringify({
                  devDependencies: { 'my-package': '^2.0.0' },
                }),
              },
            }),
            repo_1: createGraphQLRepo({
              packageJson: {
                text: JSON.stringify({
                  peerDependencies: { 'my-package': '>=1.0.0' },
                }),
              },
            }),
          },
        });
      })
    );

    const result = await enrichRepos(
      [createSkeletonRepo('acme/dev'), createSkeletonRepo('acme/peer')],
      'my-package',
      { GITHUB_TOKEN: 'fake-token' }
    );

    expect(result.repos).toHaveLength(2);
  });

  it('filters out repos with null packageJson (file deleted)', async () => {
    server.use(
      http.post('https://api.github.com/graphql', () => {
        return HttpResponse.json({
          data: {
            repo_0: createGraphQLRepo({ packageJson: null }),
          },
        });
      })
    );

    const result = await enrichRepos(
      [createSkeletonRepo('acme/app')],
      'my-package',
      { GITHUB_TOKEN: 'fake-token' }
    );

    expect(result.repos).toHaveLength(0);
  });

  it('filters out repos with malformed JSON in packageJson', async () => {
    server.use(
      http.post('https://api.github.com/graphql', () => {
        return HttpResponse.json({
          data: {
            repo_0: createGraphQLRepo({
              packageJson: { text: 'not valid json {{{' },
            }),
          },
        });
      })
    );

    const result = await enrichRepos(
      [createSkeletonRepo('acme/app')],
      'my-package',
      { GITHUB_TOKEN: 'fake-token' }
    );

    expect(result.repos).toHaveLength(0);
  });

  it('uses packageJsonPath in GraphQL query expression', async () => {
    let capturedQuery = '';

    server.use(
      http.post('https://api.github.com/graphql', async ({ request }) => {
        const body = (await request.json()) as { query: string };
        capturedQuery = body.query;

        return HttpResponse.json({
          data: {
            repo_0: createGraphQLRepo(),
          },
        });
      })
    );

    await enrichRepos(
      [createSkeletonRepo('acme/app', 'packages/core/package.json')],
      'my-package',
      { GITHUB_TOKEN: 'fake-token' }
    );

    expect(capturedQuery).toContain('HEAD:packages/core/package.json');
  });
});

function createSkeletonRepo(
  fullName: string,
  packageJsonPath = 'package.json'
): DependentRepo {
  const [owner = '', name = ''] = fullName.split('/');

  return {
    owner,
    name,
    fullName,
    stars: 0,
    lastPush: '',
    avatarUrl: 'https://avatars.githubusercontent.com/u/1',
    isFork: false,
    archived: false,
    packageJsonPath,
  };
}

function createGraphQLRepo(overrides?: {
  stargazerCount?: number;
  pushedAt?: string;
  avatarUrl?: string;
  isFork?: boolean;
  isArchived?: boolean;
  packageJson?: { text: string } | null;
}) {
  return {
    stargazerCount: overrides?.stargazerCount ?? 100,
    isArchived: overrides?.isArchived ?? false,
    isFork: overrides?.isFork ?? false,
    pushedAt: overrides?.pushedAt ?? '2025-01-01T00:00:00Z',
    owner: {
      avatarUrl:
        overrides?.avatarUrl ?? 'https://avatars.githubusercontent.com/u/1',
    },
    packageJson:
      'packageJson' in (overrides ?? {})
        ? overrides!.packageJson
        : {
            text: JSON.stringify({ dependencies: { 'my-package': '^1.0.0' } }),
          },
  };
}
