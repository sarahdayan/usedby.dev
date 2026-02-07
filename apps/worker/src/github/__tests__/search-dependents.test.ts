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

import { sleep } from '../rate-limit';
import { searchDependents } from '../search-dependents';

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

describe('searchDependents', () => {
  it('returns dependents from a single page of results', async () => {
    server.use(
      http.get('https://api.github.com/search/code', () => {
        return HttpResponse.json(
          createSearchResponse([
            createSearchItem({ fullName: 'acme/app', stars: 500 }),
            createSearchItem({ fullName: 'corp/lib', stars: 200 }),
          ])
        );
      })
    );

    const results = await searchDependents('my-package', {
      GITHUB_TOKEN: 'fake-token',
    });

    expect(results.repos).toEqual([
      {
        owner: 'acme',
        name: 'app',
        fullName: 'acme/app',
        stars: 500,
        lastPush: '2025-01-01T00:00:00Z',
        avatarUrl: 'https://avatars.githubusercontent.com/u/1',
        isFork: false,
      },
      {
        owner: 'corp',
        name: 'lib',
        fullName: 'corp/lib',
        stars: 200,
        lastPush: '2025-01-01T00:00:00Z',
        avatarUrl: 'https://avatars.githubusercontent.com/u/1',
        isFork: false,
      },
    ]);
    expect(results.partial).toBe(false);
    expect(results.rateLimited).toBe(false);
    expect(results.capped).toBe(false);
  });

  it('paginates through multiple pages', async () => {
    let requestCount = 0;

    server.use(
      http.get('https://api.github.com/search/code', ({ request }) => {
        requestCount++;
        const url = new URL(request.url);
        const page = Number(url.searchParams.get('page') ?? '1');

        if (page === 1) {
          return HttpResponse.json(
            createSearchResponse(
              Array.from({ length: 100 }, (_, i) =>
                createSearchItem({ fullName: `org/repo-${i}` })
              ),
              200
            )
          );
        }

        return HttpResponse.json(
          createSearchResponse(
            [createSearchItem({ fullName: 'corp/lib' })],
            200
          )
        );
      })
    );

    const results = await searchDependents('my-package', {
      GITHUB_TOKEN: 'fake-token',
    });

    expect(requestCount).toBe(2);
    expect(results.repos).toHaveLength(101);
    expect(results.partial).toBe(false);
    expect(results.capped).toBe(false);
  });

  it('sleeps between pages for pacing', async () => {
    server.use(
      http.get('https://api.github.com/search/code', ({ request }) => {
        const url = new URL(request.url);
        const page = Number(url.searchParams.get('page') ?? '1');

        if (page === 1) {
          return HttpResponse.json(
            createSearchResponse(
              Array.from({ length: 100 }, (_, i) =>
                createSearchItem({ fullName: `org/repo-${i}` })
              ),
              200
            )
          );
        }

        return HttpResponse.json(
          createSearchResponse(
            [createSearchItem({ fullName: 'corp/lib' })],
            200
          )
        );
      })
    );

    await searchDependents('my-package', { GITHUB_TOKEN: 'fake-token' });

    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(6_500);
  });

  it('deduplicates repos with multiple package.json matches', async () => {
    server.use(
      http.get('https://api.github.com/search/code', () => {
        return HttpResponse.json(
          createSearchResponse([
            createSearchItem({ fullName: 'acme/monorepo' }),
            createSearchItem({ fullName: 'acme/monorepo' }),
            createSearchItem({ fullName: 'acme/monorepo' }),
            createSearchItem({ fullName: 'corp/app' }),
          ])
        );
      })
    );

    const results = await searchDependents('my-package', {
      GITHUB_TOKEN: 'fake-token',
    });

    expect(results.repos).toHaveLength(2);
    expect(results.repos.map((r) => r.fullName)).toEqual([
      'acme/monorepo',
      'corp/app',
    ]);
  });

  it('returns an empty array when no results are found', async () => {
    server.use(
      http.get('https://api.github.com/search/code', () => {
        return HttpResponse.json(createSearchResponse([]));
      })
    );

    const results = await searchDependents('my-package', {
      GITHUB_TOKEN: 'fake-token',
    });

    expect(results.repos).toEqual([]);
    expect(results.partial).toBe(false);
  });

  it('throws on API error', async () => {
    server.use(
      http.get('https://api.github.com/search/code', () => {
        return HttpResponse.json(
          { message: 'Validation Failed' },
          { status: 422 }
        );
      })
    );

    await expect(
      searchDependents('my-package', { GITHUB_TOKEN: 'fake-token' })
    ).rejects.toThrow();
  });

  it('maps repository metadata correctly', async () => {
    server.use(
      http.get('https://api.github.com/search/code', () => {
        return HttpResponse.json(
          createSearchResponse([
            createSearchItem({
              fullName: 'acme/app',
              stars: 1234,
              pushedAt: '2025-06-15T12:00:00Z',
              avatarUrl: 'https://avatars.githubusercontent.com/u/42',
              isFork: true,
            }),
          ])
        );
      })
    );

    const results = await searchDependents('my-package', {
      GITHUB_TOKEN: 'fake-token',
    });

    expect(results.repos[0]).toEqual({
      owner: 'acme',
      name: 'app',
      fullName: 'acme/app',
      stars: 1234,
      lastPush: '2025-06-15T12:00:00Z',
      avatarUrl: 'https://avatars.githubusercontent.com/u/42',
      isFork: true,
    });
  });

  it('retries on rate limit and succeeds', async () => {
    let callCount = 0;

    server.use(
      http.get('https://api.github.com/search/code', () => {
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
          createSearchResponse([
            createSearchItem({ fullName: 'acme/app', stars: 100 }),
          ])
        );
      })
    );

    const results = await searchDependents('my-package', {
      GITHUB_TOKEN: 'fake-token',
    });

    expect(callCount).toBe(2);
    expect(results.repos).toHaveLength(1);
    expect(results.partial).toBe(false);
  });

  it('retries on secondary rate limit (retry-after) and succeeds', async () => {
    let callCount = 0;

    server.use(
      http.get('https://api.github.com/search/code', () => {
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
          createSearchResponse([
            createSearchItem({ fullName: 'acme/app', stars: 100 }),
          ])
        );
      })
    );

    const results = await searchDependents('my-package', {
      GITHUB_TOKEN: 'fake-token',
    });

    expect(callCount).toBe(2);
    expect(results.repos).toHaveLength(1);
    expect(results.partial).toBe(false);
  });

  it('returns partial results when retries are exhausted', async () => {
    let callCount = 0;

    server.use(
      http.get('https://api.github.com/search/code', ({ request }) => {
        callCount++;
        const url = new URL(request.url);
        const page = Number(url.searchParams.get('page') ?? '1');

        if (page === 1 && callCount === 1) {
          return HttpResponse.json(
            createSearchResponse(
              Array.from({ length: 100 }, (_, i) =>
                createSearchItem({ fullName: `org/repo-${i}` })
              ),
              1000
            )
          );
        }

        // All attempts for page 2 fail with rate limit
        return HttpResponse.json(
          { message: 'rate limit exceeded' },
          {
            status: 403,
            headers: { 'x-ratelimit-remaining': '0' },
          }
        );
      })
    );

    const results = await searchDependents('my-package', {
      GITHUB_TOKEN: 'fake-token',
    });

    expect(results.repos).toHaveLength(100);
    expect(results.partial).toBe(true);
    expect(results.rateLimited).toBe(true);
  });

  it('returns partial results with zero repos when rate limited on first page', async () => {
    server.use(
      http.get('https://api.github.com/search/code', () => {
        return HttpResponse.json(
          { message: 'rate limit exceeded' },
          {
            status: 403,
            headers: { 'x-ratelimit-remaining': '0' },
          }
        );
      })
    );

    const results = await searchDependents('my-package', {
      GITHUB_TOKEN: 'fake-token',
    });

    expect(results.repos).toEqual([]);
    expect(results.partial).toBe(true);
    expect(results.rateLimited).toBe(true);
  });

  it('stops at 10 pages and sets capped to true', async () => {
    let requestCount = 0;

    server.use(
      http.get('https://api.github.com/search/code', () => {
        requestCount++;

        return HttpResponse.json(
          createSearchResponse(
            Array.from({ length: 100 }, (_, i) =>
              createSearchItem({
                fullName: `org/repo-${requestCount}-${i}`,
              })
            ),
            5000
          )
        );
      })
    );

    const results = await searchDependents('my-package', {
      GITHUB_TOKEN: 'fake-token',
    });

    expect(requestCount).toBe(10);
    expect(results.repos).toHaveLength(1000);
    expect(results.partial).toBe(false);
    expect(results.capped).toBe(true);
  });

  it('does not sleep after the last page', async () => {
    let requestCount = 0;

    server.use(
      http.get('https://api.github.com/search/code', () => {
        requestCount++;

        return HttpResponse.json(
          createSearchResponse(
            Array.from({ length: 100 }, (_, i) =>
              createSearchItem({
                fullName: `org/repo-${requestCount}-${i}`,
              })
            ),
            5000
          )
        );
      })
    );

    await searchDependents('my-package', { GITHUB_TOKEN: 'fake-token' });

    // 10 pages, but sleep only between pages (9 times, not after page 10)
    expect(sleep).toHaveBeenCalledTimes(9);
  });

  it('stops early when fewer results than per_page', async () => {
    let requestCount = 0;

    server.use(
      http.get('https://api.github.com/search/code', () => {
        requestCount++;

        return HttpResponse.json(
          createSearchResponse([
            createSearchItem({ fullName: `org/repo-${requestCount}` }),
          ])
        );
      })
    );

    const results = await searchDependents('my-package', {
      GITHUB_TOKEN: 'fake-token',
    });

    expect(requestCount).toBe(1);
    expect(results.repos).toHaveLength(1);
  });

  it('re-throws non-rate-limit errors', async () => {
    server.use(
      http.get('https://api.github.com/search/code', () => {
        return HttpResponse.json(
          { message: 'Internal Server Error' },
          { status: 500 }
        );
      })
    );

    await expect(
      searchDependents('my-package', { GITHUB_TOKEN: 'fake-token' })
    ).rejects.toThrow();
  });

  it('re-throws 403 without rate limit headers', async () => {
    server.use(
      http.get('https://api.github.com/search/code', () => {
        return HttpResponse.json(
          { message: 'Resource not accessible by integration' },
          { status: 403 }
        );
      })
    );

    await expect(
      searchDependents('my-package', { GITHUB_TOKEN: 'fake-token' })
    ).rejects.toThrow();
  });
});

function createSearchItem(overrides: {
  fullName: string;
  stars?: number;
  pushedAt?: string;
  avatarUrl?: string;
  isFork?: boolean;
}) {
  const [owner, name] = overrides.fullName.split('/');

  return {
    name: 'package.json',
    path: 'package.json',
    sha: 'abc123',
    url: `https://api.github.com/repos/${overrides.fullName}/contents/package.json`,
    git_url: `https://api.github.com/repos/${overrides.fullName}/git/blobs/abc123`,
    html_url: `https://github.com/${overrides.fullName}/blob/main/package.json`,
    score: 1,
    repository: {
      id: 1,
      node_id: 'node1',
      name,
      full_name: overrides.fullName,
      private: false,
      fork: overrides.isFork ?? false,
      owner: {
        login: owner,
        id: 1,
        node_id: 'node1',
        avatar_url:
          overrides.avatarUrl ?? `https://avatars.githubusercontent.com/u/1`,
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
      archive_url: '',
      assignees_url: '',
      blobs_url: '',
      branches_url: '',
      collaborators_url: '',
      comments_url: '',
      commits_url: '',
      compare_url: '',
      contents_url: '',
      contributors_url: '',
      deployments_url: '',
      downloads_url: '',
      events_url: '',
      forks_url: '',
      git_commits_url: '',
      git_refs_url: '',
      git_tags_url: '',
      hooks_url: '',
      issue_comment_url: '',
      issue_events_url: '',
      issues_url: '',
      keys_url: '',
      labels_url: '',
      languages_url: '',
      merges_url: '',
      milestones_url: '',
      notifications_url: '',
      pulls_url: '',
      releases_url: '',
      stargazers_url: '',
      statuses_url: '',
      subscribers_url: '',
      subscription_url: '',
      tags_url: '',
      teams_url: '',
      trees_url: '',
      stargazers_count: overrides.stars ?? 100,
      pushed_at: overrides.pushedAt ?? '2025-01-01T00:00:00Z',
    },
  };
}

function createSearchResponse(
  items: ReturnType<typeof createSearchItem>[],
  totalCount?: number
) {
  return {
    total_count: totalCount ?? items.length,
    incomplete_results: false,
    items,
  };
}
