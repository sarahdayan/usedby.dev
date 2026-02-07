import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { searchDependents } from '../search-dependents';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
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

    const results = await searchDependents('my-package', { GITHUB_TOKEN: 'fake-token' });

    expect(results).toEqual([
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
              [createSearchItem({ fullName: 'acme/app' })],
              2
            ),
            {
              headers: {
                link: '<https://api.github.com/search/code?q=my-package+filename:package.json&per_page=100&page=2>; rel="next", <https://api.github.com/search/code?q=my-package+filename:package.json&per_page=100&page=2>; rel="last"',
              },
            }
          );
        }

        return HttpResponse.json(
          createSearchResponse(
            [createSearchItem({ fullName: 'corp/lib' })],
            2
          )
        );
      })
    );

    const results = await searchDependents('my-package', { GITHUB_TOKEN: 'fake-token' });

    expect(requestCount).toBe(2);
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.fullName)).toEqual(['acme/app', 'corp/lib']);
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

    const results = await searchDependents('my-package', { GITHUB_TOKEN: 'fake-token' });

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.fullName)).toEqual([
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

    const results = await searchDependents('my-package', { GITHUB_TOKEN: 'fake-token' });

    expect(results).toEqual([]);
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

    const results = await searchDependents('my-package', { GITHUB_TOKEN: 'fake-token' });

    expect(results[0]).toEqual({
      owner: 'acme',
      name: 'app',
      fullName: 'acme/app',
      stars: 1234,
      lastPush: '2025-06-15T12:00:00Z',
      avatarUrl: 'https://avatars.githubusercontent.com/u/42',
      isFork: true,
    });
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
