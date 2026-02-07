import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ScoredRepo } from '../github/types';

vi.mock('../cache/get-dependents', () => ({
  getDependents: vi.fn(),
}));

vi.mock('../svg/fetch-avatars', () => ({
  fetchAvatars: vi.fn(),
}));

vi.mock('../svg/render-mosaic', () => ({
  renderMosaic: vi.fn(),
}));

import { getDependents } from '../cache/get-dependents';
import { fetchAvatars } from '../svg/fetch-avatars';
import { renderMosaic } from '../svg/render-mosaic';
import worker from '../index';

afterEach(() => {
  vi.clearAllMocks();
});

describe('worker', () => {
  describe('GET /', () => {
    it('returns 200 health check', async () => {
      const response = await worker.fetch(
        createRequest('/'),
        createEnv(),
        createCtx()
      );

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('usedby.dev worker');
      expect(response.headers.get('content-type')).toBe('text/plain');
      expect(getDependents).not.toHaveBeenCalled();
    });
  });

  describe('GET /:owner/:repo', () => {
    it('returns 200 with SVG content type and body', async () => {
      const repos = [createScoredRepo('app')];
      vi.mocked(getDependents).mockResolvedValue({
        repos,
        fromCache: false,
        refreshing: false,
      });
      vi.mocked(fetchAvatars).mockResolvedValue([
        { dataUri: 'data:image/png;base64,abc', fullName: 'facebook/app' },
      ]);
      vi.mocked(renderMosaic).mockReturnValue('<svg>mosaic</svg>');

      const response = await worker.fetch(
        createRequest('/facebook/react'),
        createEnv(),
        createCtx()
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
      expect(await response.text()).toBe('<svg>mosaic</svg>');
    });

    it('passes max query param to renderer', async () => {
      vi.mocked(getDependents).mockResolvedValue({
        repos: [],
        fromCache: false,
        refreshing: false,
      });
      vi.mocked(fetchAvatars).mockResolvedValue([]);
      vi.mocked(renderMosaic).mockReturnValue('<svg></svg>');

      await worker.fetch(
        createRequest('/facebook/react?max=10'),
        createEnv(),
        createCtx()
      );

      expect(renderMosaic).toHaveBeenCalledWith([], { max: 10 });
    });

    it('passes undefined max when param is absent', async () => {
      vi.mocked(getDependents).mockResolvedValue({
        repos: [],
        fromCache: false,
        refreshing: false,
      });
      vi.mocked(fetchAvatars).mockResolvedValue([]);
      vi.mocked(renderMosaic).mockReturnValue('<svg></svg>');

      await worker.fetch(
        createRequest('/facebook/react'),
        createEnv(),
        createCtx()
      );

      expect(renderMosaic).toHaveBeenCalledWith([], { max: undefined });
    });

    it('sets correct Cache-Control header', async () => {
      vi.mocked(getDependents).mockResolvedValue({
        repos: [],
        fromCache: false,
        refreshing: false,
      });
      vi.mocked(fetchAvatars).mockResolvedValue([]);
      vi.mocked(renderMosaic).mockReturnValue('<svg></svg>');

      const response = await worker.fetch(
        createRequest('/facebook/react'),
        createEnv(),
        createCtx()
      );

      expect(response.headers.get('Cache-Control')).toBe(
        'public, max-age=86400, s-maxage=86400'
      );
    });

    it('returns valid SVG for empty repos', async () => {
      vi.mocked(getDependents).mockResolvedValue({
        repos: [],
        fromCache: false,
        refreshing: false,
      });
      vi.mocked(fetchAvatars).mockResolvedValue([]);
      vi.mocked(renderMosaic).mockReturnValue(
        '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>'
      );

      const response = await worker.fetch(
        createRequest('/facebook/react'),
        createEnv(),
        createCtx()
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
      expect(await response.text()).toContain('<svg');
    });

    it('calls getDependents with correct options', async () => {
      const env = createEnv();
      const ctx = createCtx();
      vi.mocked(getDependents).mockResolvedValue({
        repos: [],
        fromCache: false,
        refreshing: false,
      });
      vi.mocked(fetchAvatars).mockResolvedValue([]);
      vi.mocked(renderMosaic).mockReturnValue('<svg></svg>');

      await worker.fetch(createRequest('/facebook/react'), env, ctx);

      expect(getDependents).toHaveBeenCalledWith({
        platform: 'npm',
        packageName: 'facebook/react',
        kv: env.DEPENDENTS_CACHE,
        env: { GITHUB_TOKEN: 'fake-token' },
        waitUntil: expect.any(Function),
      });
    });

    it('returns 500 on pipeline error', async () => {
      vi.mocked(getDependents).mockRejectedValue(new Error('API failure'));
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      try {
        const response = await worker.fetch(
          createRequest('/facebook/react'),
          createEnv(),
          createCtx()
        );

        expect(response.status).toBe(500);
        expect(response.headers.get('content-type')).toBe('text/plain');
        expect(await response.text()).toBe('Internal server error');
      } finally {
        consoleSpy.mockRestore();
      }
    });
  });

  describe('max validation', () => {
    it.each(['abc', '', '3.7', '0', '-5'])(
      'returns 400 for invalid max=%s',
      async (max) => {
        const response = await worker.fetch(
          createRequest(`/facebook/react?max=${max}`),
          createEnv(),
          createCtx()
        );

        expect(response.status).toBe(400);
        expect(await response.text()).toBe('Invalid max parameter');
        expect(getDependents).not.toHaveBeenCalled();
      }
    );
  });

  describe('method restriction', () => {
    it('returns 405 for POST', async () => {
      const response = await worker.fetch(
        createRequest('/facebook/react', 'POST'),
        createEnv(),
        createCtx()
      );

      expect(response.status).toBe(405);
      expect(getDependents).not.toHaveBeenCalled();
    });
  });

  describe('404 routes', () => {
    it('returns 404 for single segment', async () => {
      const response = await worker.fetch(
        createRequest('/react'),
        createEnv(),
        createCtx()
      );

      expect(response.status).toBe(404);
      expect(getDependents).not.toHaveBeenCalled();
    });

    it('returns 404 for three segments', async () => {
      const response = await worker.fetch(
        createRequest('/a/b/c'),
        createEnv(),
        createCtx()
      );

      expect(response.status).toBe(404);
      expect(getDependents).not.toHaveBeenCalled();
    });

    it('handles trailing slash as valid route', async () => {
      vi.mocked(getDependents).mockResolvedValue({
        repos: [],
        fromCache: false,
        refreshing: false,
      });
      vi.mocked(fetchAvatars).mockResolvedValue([]);
      vi.mocked(renderMosaic).mockReturnValue('<svg></svg>');

      const response = await worker.fetch(
        createRequest('/facebook/react/'),
        createEnv(),
        createCtx()
      );

      expect(response.status).toBe(200);
    });

    it('returns 404 for invalid segment characters', async () => {
      const response = await worker.fetch(
        createRequest('/foo%00bar/baz'),
        createEnv(),
        createCtx()
      );

      expect(response.status).toBe(404);
      expect(getDependents).not.toHaveBeenCalled();
    });
  });
});

function createScoredRepo(name: string): ScoredRepo {
  return {
    owner: 'facebook',
    name,
    fullName: `facebook/${name}`,
    stars: 100,
    lastPush: '2025-01-01T00:00:00Z',
    avatarUrl: 'https://example.com/avatar.png',
    isFork: false,
    archived: false,
    score: 95,
  };
}

function createEnv() {
  return {
    DEPENDENTS_CACHE: {} as KVNamespace,
    GITHUB_TOKEN: 'fake-token',
  };
}

function createCtx() {
  return {
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
  } as unknown as ExecutionContext;
}

function createRequest(path: string, method = 'GET') {
  return new Request(`https://usedby.dev${path}`, {
    method,
  }) as unknown as Request<unknown, IncomingRequestCfProperties>;
}
