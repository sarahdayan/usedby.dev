import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { enrichRepos } from '../enrich-repos';
import { sleep } from '../rate-limit';
import type { DependentRepo } from '../types';

vi.mock('../rate-limit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../rate-limit')>();

  return {
    ...actual,
    sleep: vi.fn(),
  };
});

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());

describe('enrichRepos', () => {
  it('enriches repos with accurate metadata', async () => {
    server.use(
      http.get('https://api.github.com/repos/acme/app', () => {
        return HttpResponse.json(
          createRepoResponse({
            fullName: 'acme/app',
            stars: 5000,
            pushedAt: '2025-06-01T00:00:00Z',
            avatarUrl: 'https://avatars.githubusercontent.com/u/99',
            isFork: false,
            archived: false,
          })
        );
      }),
      http.get('https://api.github.com/repos/corp/lib', () => {
        return HttpResponse.json(
          createRepoResponse({
            fullName: 'corp/lib',
            stars: 1200,
            pushedAt: '2025-05-15T00:00:00Z',
            avatarUrl: 'https://avatars.githubusercontent.com/u/42',
            isFork: true,
            archived: true,
          })
        );
      })
    );

    const result = await enrichRepos(
      [createSkeletonRepo('acme/app'), createSkeletonRepo('corp/lib')],
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
      },
    ]);
  });

  it('skips 404 repos', async () => {
    server.use(
      http.get('https://api.github.com/repos/acme/app', () => {
        return HttpResponse.json(
          createRepoResponse({ fullName: 'acme/app', stars: 500 })
        );
      }),
      http.get('https://api.github.com/repos/deleted/repo', () => {
        return HttpResponse.json({ message: 'Not Found' }, { status: 404 });
      })
    );

    const result = await enrichRepos(
      [createSkeletonRepo('acme/app'), createSkeletonRepo('deleted/repo')],
      { GITHUB_TOKEN: 'fake-token' }
    );

    expect(result.repos).toHaveLength(1);
    expect(result.repos[0]!.fullName).toBe('acme/app');
    expect(result.rateLimited).toBe(false);
  });

  it('handles empty input', async () => {
    const result = await enrichRepos([], { GITHUB_TOKEN: 'fake-token' });

    expect(result.repos).toEqual([]);
    expect(result.rateLimited).toBe(false);
  });

  it('processes multiple batches', async () => {
    const repoNames = Array.from({ length: 15 }, (_, i) => `org/repo-${i}`);

    server.use(
      http.get('https://api.github.com/repos/:owner/:repo', ({ params }) => {
        const fullName = `${params.owner}/${params.repo}`;

        return HttpResponse.json(createRepoResponse({ fullName, stars: 100 }));
      })
    );

    const result = await enrichRepos(repoNames.map(createSkeletonRepo), {
      GITHUB_TOKEN: 'fake-token',
    });

    expect(result.repos).toHaveLength(15);
    expect(result.rateLimited).toBe(false);
  });

  it('returns partial results on rate limit exhaustion', async () => {
    let callCount = 0;

    server.use(
      http.get('https://api.github.com/repos/:owner/:repo', () => {
        callCount++;

        // First 10 succeed (batch 1), then rate limit on batch 2
        if (callCount <= 10) {
          return HttpResponse.json(
            createRepoResponse({
              fullName: `org/repo-${callCount}`,
              stars: 100,
            })
          );
        }

        return HttpResponse.json(
          { message: 'rate limit exceeded' },
          {
            status: 403,
            headers: { 'x-ratelimit-remaining': '0' },
          }
        );
      })
    );

    const repos = Array.from({ length: 15 }, (_, i) =>
      createSkeletonRepo(`org/repo-${i}`)
    );

    const result = await enrichRepos(repos, { GITHUB_TOKEN: 'fake-token' });

    expect(result.repos).toHaveLength(10);
    expect(result.rateLimited).toBe(true);
  });

  it('retries on primary rate limit and succeeds', async () => {
    let callCount = 0;

    server.use(
      http.get('https://api.github.com/repos/acme/app', () => {
        callCount++;

        if (callCount === 1) {
          return HttpResponse.json(
            { message: 'rate limit exceeded' },
            {
              status: 403,
              headers: {
                'x-ratelimit-remaining': '0',
                'x-ratelimit-reset': '1700000000',
              },
            }
          );
        }

        return HttpResponse.json(
          createRepoResponse({ fullName: 'acme/app', stars: 500 })
        );
      })
    );

    const result = await enrichRepos([createSkeletonRepo('acme/app')], {
      GITHUB_TOKEN: 'fake-token',
    });

    expect(callCount).toBe(2);
    expect(result.repos).toHaveLength(1);
    expect(result.repos[0]!.stars).toBe(500);
    expect(result.rateLimited).toBe(false);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it('retries on secondary rate limit (retry-after) and succeeds', async () => {
    let callCount = 0;

    server.use(
      http.get('https://api.github.com/repos/acme/app', () => {
        callCount++;

        if (callCount === 1) {
          return HttpResponse.json(
            { message: 'secondary rate limit' },
            {
              status: 403,
              headers: { 'retry-after': '30' },
            }
          );
        }

        return HttpResponse.json(
          createRepoResponse({ fullName: 'acme/app', stars: 500 })
        );
      })
    );

    const result = await enrichRepos([createSkeletonRepo('acme/app')], {
      GITHUB_TOKEN: 'fake-token',
    });

    expect(callCount).toBe(2);
    expect(result.repos).toHaveLength(1);
    expect(result.rateLimited).toBe(false);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it('skips multiple 404s within a batch', async () => {
    server.use(
      http.get('https://api.github.com/repos/:owner/:repo', ({ params }) => {
        const fullName = `${params.owner}/${params.repo}`;

        if (
          fullName === 'gone/one' ||
          fullName === 'gone/two' ||
          fullName === 'gone/three'
        ) {
          return HttpResponse.json({ message: 'Not Found' }, { status: 404 });
        }

        return HttpResponse.json(createRepoResponse({ fullName, stars: 100 }));
      })
    );

    const repos = [
      'org/a',
      'gone/one',
      'org/b',
      'gone/two',
      'org/c',
      'gone/three',
      'org/d',
      'org/e',
      'org/f',
      'org/g',
    ].map(createSkeletonRepo);

    const result = await enrichRepos(repos, { GITHUB_TOKEN: 'fake-token' });

    expect(result.repos).toHaveLength(7);
    expect(result.repos.map((r) => r.fullName)).toEqual([
      'org/a',
      'org/b',
      'org/c',
      'org/d',
      'org/e',
      'org/f',
      'org/g',
    ]);
    expect(result.rateLimited).toBe(false);
  });

  it('returns partial results when retries are exhausted within a batch', async () => {
    server.use(
      http.get('https://api.github.com/repos/acme/app', () => {
        return HttpResponse.json(
          { message: 'rate limit exceeded' },
          {
            status: 403,
            headers: { 'x-ratelimit-remaining': '0' },
          }
        );
      })
    );

    const result = await enrichRepos([createSkeletonRepo('acme/app')], {
      GITHUB_TOKEN: 'fake-token',
    });

    expect(result.repos).toHaveLength(0);
    expect(result.rateLimited).toBe(true);
  });

  it('throws on non-rate-limit errors', async () => {
    server.use(
      http.get('https://api.github.com/repos/acme/app', () => {
        return HttpResponse.json(
          { message: 'Internal Server Error' },
          { status: 500 }
        );
      })
    );

    await expect(
      enrichRepos([createSkeletonRepo('acme/app')], {
        GITHUB_TOKEN: 'fake-token',
      })
    ).rejects.toThrow();
  });

  it('re-throws 403 without rate limit headers', async () => {
    server.use(
      http.get('https://api.github.com/repos/acme/app', () => {
        return HttpResponse.json(
          { message: 'Resource not accessible by integration' },
          { status: 403 }
        );
      })
    );

    await expect(
      enrichRepos([createSkeletonRepo('acme/app')], {
        GITHUB_TOKEN: 'fake-token',
      })
    ).rejects.toThrow();
  });
});

function createSkeletonRepo(fullName: string): DependentRepo {
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
  };
}

function createRepoResponse(overrides: {
  fullName: string;
  stars?: number;
  pushedAt?: string;
  avatarUrl?: string;
  isFork?: boolean;
  archived?: boolean;
}) {
  const [owner, name] = overrides.fullName.split('/');

  return {
    id: 1,
    node_id: 'node1',
    name,
    full_name: overrides.fullName,
    private: false,
    fork: overrides.isFork ?? false,
    archived: overrides.archived ?? false,
    owner: {
      login: owner,
      id: 1,
      node_id: 'node1',
      avatar_url:
        overrides.avatarUrl ?? 'https://avatars.githubusercontent.com/u/1',
      gravatar_id: '',
      url: `https://api.github.com/users/${owner}`,
      html_url: `https://github.com/${owner}`,
      type: 'User',
      site_admin: false,
      followers_url: '',
      following_url: '',
      gists_url: '',
      starred_url: '',
      subscriptions_url: '',
      organizations_url: '',
      repos_url: '',
      events_url: '',
      received_events_url: '',
    },
    html_url: `https://github.com/${overrides.fullName}`,
    description: null,
    url: `https://api.github.com/repos/${overrides.fullName}`,
    stargazers_count: overrides.stars ?? 100,
    pushed_at: overrides.pushedAt ?? '2025-01-01T00:00:00Z',
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    size: 1000,
    language: 'TypeScript',
    default_branch: 'main',
    forks_count: 10,
    open_issues_count: 5,
    watchers_count: overrides.stars ?? 100,
    has_issues: true,
    has_projects: true,
    has_downloads: true,
    has_wiki: true,
    has_pages: false,
    has_discussions: false,
    mirror_url: null,
    license: null,
    topics: [],
    visibility: 'public',
    forks: 10,
    open_issues: 5,
    watchers: overrides.stars ?? 100,
    permissions: {
      admin: false,
      maintain: false,
      push: false,
      triage: false,
      pull: true,
    },
  };
}
