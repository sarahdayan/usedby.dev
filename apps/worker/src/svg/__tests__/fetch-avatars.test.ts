import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { fetchAvatars } from '../fetch-avatars';
import type { ScoredRepo } from '../../github/types';

const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('fetchAvatars', () => {
  it('fetches each avatar URL with ?s=80', async () => {
    const requestedUrls: string[] = [];

    server.use(
      http.get('https://avatars.githubusercontent.com/*', ({ request }) => {
        requestedUrls.push(request.url);
        return HttpResponse.arrayBuffer(pngBytes.buffer, {
          headers: { 'content-type': 'image/png' },
        });
      })
    );

    const repos = [
      createScoredRepo({ name: 'alpha' }),
      createScoredRepo({ name: 'beta' }),
    ];

    await fetchAvatars(repos);

    expect(requestedUrls).toHaveLength(2);
    expect(requestedUrls[0]).toContain('?s=80');
    expect(requestedUrls[1]).toContain('?s=80');
  });

  it('produces valid data URIs from response', async () => {
    server.use(
      http.get('https://avatars.githubusercontent.com/*', () =>
        HttpResponse.arrayBuffer(pngBytes.buffer, {
          headers: { 'content-type': 'image/png' },
        })
      )
    );

    const repos = [createScoredRepo({ name: 'alpha' })];
    const avatars = await fetchAvatars(repos);

    expect(avatars[0]!.dataUri).toMatch(/^data:image\/png;base64,.+/);
  });

  it('returns correct AvatarData shape with fullName', async () => {
    server.use(
      http.get('https://avatars.githubusercontent.com/*', () =>
        HttpResponse.arrayBuffer(pngBytes.buffer, {
          headers: { 'content-type': 'image/png' },
        })
      )
    );

    const repos = [createScoredRepo({ name: 'alpha' })];
    const avatars = await fetchAvatars(repos);

    expect(avatars).toHaveLength(1);
    expect(avatars[0]).toEqual({
      dataUri: expect.stringMatching(/^data:image\/png;base64,/),
      fullName: 'test/alpha',
    });
  });

  it('skips failed fetches without throwing', async () => {
    server.use(
      http.get('https://avatars.githubusercontent.com/u/alpha', () =>
        HttpResponse.arrayBuffer(pngBytes.buffer, {
          headers: { 'content-type': 'image/png' },
        })
      ),
      http.get(
        'https://avatars.githubusercontent.com/u/broken',
        () => new HttpResponse(null, { status: 500 })
      ),
      http.get('https://avatars.githubusercontent.com/u/gamma', () =>
        HttpResponse.arrayBuffer(pngBytes.buffer, {
          headers: { 'content-type': 'image/png' },
        })
      )
    );

    const repos = [
      createScoredRepo({ name: 'alpha' }),
      createScoredRepo({ name: 'broken' }),
      createScoredRepo({ name: 'gamma' }),
    ];

    const avatars = await fetchAvatars(repos);

    expect(avatars).toHaveLength(2);
    expect(avatars[0]!.fullName).toBe('test/alpha');
    expect(avatars[1]!.fullName).toBe('test/gamma');
  });

  it('returns empty array for empty input', async () => {
    const avatars = await fetchAvatars([]);

    expect(avatars).toEqual([]);
  });

  it('returns empty array when all fetches fail', async () => {
    server.use(
      http.get(
        'https://avatars.githubusercontent.com/*',
        () => new HttpResponse(null, { status: 500 })
      )
    );

    const repos = [
      createScoredRepo({ name: 'broken1' }),
      createScoredRepo({ name: 'broken2' }),
    ];

    const avatars = await fetchAvatars(repos);

    expect(avatars).toEqual([]);
  });

  it('uses response content type in data URI', async () => {
    server.use(
      http.get('https://avatars.githubusercontent.com/*', () =>
        HttpResponse.arrayBuffer(pngBytes.buffer, {
          headers: { 'content-type': 'image/jpeg' },
        })
      )
    );

    const repos = [createScoredRepo({ name: 'alpha' })];
    const avatars = await fetchAvatars(repos);

    expect(avatars[0]!.dataUri).toMatch(/^data:image\/jpeg;base64,/);
  });
});

function createScoredRepo(
  overrides: Partial<ScoredRepo> & { name: string }
): ScoredRepo {
  return {
    owner: 'test',
    fullName: `test/${overrides.name}`,
    stars: 100,
    lastPush: '2025-01-01T00:00:00Z',
    avatarUrl: `https://avatars.githubusercontent.com/u/${overrides.name}`,
    isFork: false,
    archived: false,
    score: 100,
    ...overrides,
  };
}
