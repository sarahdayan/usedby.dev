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

vi.mock('../svg/render-detailed', () => ({
  renderDetailed: vi.fn(),
}));

vi.mock('../svg/render-message', () => ({
  renderMessage: vi.fn(),
}));

vi.mock('../scheduled/run-scheduled-refresh', () => ({
  runScheduledRefresh: vi.fn(),
}));

import { getDependents } from '../cache/get-dependents';
import { PROD_LIMITS } from '../github/pipeline-limits';
import { runScheduledRefresh } from '../scheduled/run-scheduled-refresh';
import { fetchAvatars } from '../svg/fetch-avatars';
import { renderMessage } from '../svg/render-message';
import { renderMosaic } from '../svg/render-mosaic';
import worker from '../index';

afterEach(() => {
  vi.clearAllMocks();
});

describe('worker', () => {
  describe('scheduled', () => {
    it('calls runScheduledRefresh with env', async () => {
      vi.mocked(runScheduledRefresh).mockResolvedValue({
        keysScanned: 0,
        refreshed: 0,
        skipped: 0,
        evicted: 0,
        errors: 0,
        abortedDueToRateLimit: false,
      });
      const env = createEnv();
      const ctx = createCtx();

      await worker.scheduled!(
        { cron: '0 4 * * *', scheduledTime: Date.now() } as ScheduledEvent,
        env,
        ctx
      );

      expect(runScheduledRefresh).toHaveBeenCalledWith(env);
      expect(ctx.waitUntil).toHaveBeenCalled();
    });

    it('catches errors from runScheduledRefresh', async () => {
      vi.mocked(runScheduledRefresh).mockRejectedValue(new Error('KV failure'));
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const ctx = createCtx();

      await worker.scheduled!(
        { cron: '0 4 * * *', scheduledTime: Date.now() } as ScheduledEvent,
        createEnv(),
        ctx
      );

      // Wait for the promise passed to waitUntil to settle
      const waitUntilPromise = vi.mocked(ctx.waitUntil).mock.calls[0]![0];
      await waitUntilPromise;

      expect(consoleSpy).toHaveBeenCalledWith(
        '[scheduled] Refresh failed:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

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

  describe('GET /:platform/:package', () => {
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
        createRequest('/npm/react'),
        createEnv(),
        createCtx()
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
      expect(await response.text()).toBe('<svg>mosaic</svg>');
    });

    it('slices repos to max before fetching avatars', async () => {
      const repos = Array.from({ length: 5 }, (_, i) =>
        createScoredRepo(`repo-${i}`)
      );

      vi.mocked(getDependents).mockResolvedValue({
        repos,
        fromCache: false,
        refreshing: false,
      });
      vi.mocked(fetchAvatars).mockResolvedValue([]);
      vi.mocked(renderMosaic).mockReturnValue('<svg></svg>');

      await worker.fetch(
        createRequest('/npm/react?max=2'),
        createEnv(),
        createCtx()
      );

      expect(fetchAvatars).toHaveBeenCalledWith(repos.slice(0, 2));
    });

    it('uses default max when param is absent', async () => {
      vi.mocked(getDependents).mockResolvedValue({
        repos: [],
        fromCache: false,
        refreshing: false,
      });
      vi.mocked(fetchAvatars).mockResolvedValue([]);
      vi.mocked(renderMosaic).mockReturnValue('<svg></svg>');

      await worker.fetch(createRequest('/npm/react'), createEnv(), createCtx());

      expect(fetchAvatars).toHaveBeenCalledWith([]);
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
        createRequest('/npm/react'),
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
        createRequest('/npm/react'),
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

      await worker.fetch(createRequest('/npm/react'), env, ctx);

      expect(getDependents).toHaveBeenCalledWith(
        expect.objectContaining({
          platform: 'npm',
          packageName: 'react',
          kv: env.DEPENDENTS_CACHE,
          env: { GITHUB_TOKEN: 'fake-token' },
          waitUntil: expect.any(Function),
          limits: PROD_LIMITS,
        })
      );
    });

    it('calls getDependents with scoped package name', async () => {
      const env = createEnv();
      const ctx = createCtx();
      vi.mocked(getDependents).mockResolvedValue({
        repos: [],
        fromCache: false,
        refreshing: false,
      });
      vi.mocked(fetchAvatars).mockResolvedValue([]);
      vi.mocked(renderMosaic).mockReturnValue('<svg></svg>');

      await worker.fetch(createRequest('/npm/@babel/core'), env, ctx);

      expect(getDependents).toHaveBeenCalledWith(
        expect.objectContaining({
          platform: 'npm',
          packageName: '@babel/core',
          kv: env.DEPENDENTS_CACHE,
          env: { GITHUB_TOKEN: 'fake-token' },
          waitUntil: expect.any(Function),
          limits: PROD_LIMITS,
        })
      );
    });

    it('does not produce dev logs when DEV is not set', async () => {
      vi.mocked(getDependents).mockResolvedValue({
        repos: [createScoredRepo('app')],
        fromCache: false,
        refreshing: false,
      });
      vi.mocked(fetchAvatars).mockResolvedValue([
        { dataUri: 'data:image/png;base64,abc', fullName: 'facebook/app' },
      ]);
      vi.mocked(renderMosaic).mockReturnValue('<svg></svg>');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      try {
        await worker.fetch(
          createRequest('/npm/react'),
          createEnv(),
          createCtx()
        );

        const devCalls = consoleSpy.mock.calls.filter(
          (args) => typeof args[0] === 'string' && args[0].startsWith('[dev]')
        );
        expect(devCalls).toHaveLength(0);
      } finally {
        consoleSpy.mockRestore();
      }
    });

    it('returns 500 SVG on pipeline error', async () => {
      vi.mocked(getDependents).mockRejectedValue(new Error('API failure'));
      vi.mocked(renderMessage).mockReturnValue(
        '<svg xmlns="http://www.w3.org/2000/svg">Something went wrong</svg>'
      );
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      try {
        const response = await worker.fetch(
          createRequest('/npm/react'),
          createEnv(),
          createCtx()
        );

        expect(response.status).toBe(500);
        expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
        expect(response.headers.get('Cache-Control')).toBe('no-store');
        expect(await response.text()).toContain('Something went wrong');
        expect(renderMessage).toHaveBeenCalledWith('Something went wrong');
      } finally {
        consoleSpy.mockRestore();
      }
    });

    it('returns 500 SVG when fetchAvatars throws', async () => {
      vi.mocked(getDependents).mockResolvedValue({
        repos: [createScoredRepo('app')],
        fromCache: false,
        refreshing: false,
      });
      vi.mocked(fetchAvatars).mockRejectedValue(new Error('network error'));
      vi.mocked(renderMessage).mockReturnValue(
        '<svg xmlns="http://www.w3.org/2000/svg">Something went wrong</svg>'
      );
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      try {
        const response = await worker.fetch(
          createRequest('/npm/react'),
          createEnv(),
          createCtx()
        );

        expect(response.status).toBe(500);
        expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
        expect(renderMessage).toHaveBeenCalledWith('Something went wrong');
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
          createRequest(`/npm/react?max=${max}`),
          createEnv(),
          createCtx()
        );

        expect(response.status).toBe(400);
        expect(await response.text()).toBe('Invalid max parameter');
        expect(getDependents).not.toHaveBeenCalled();
      }
    );
  });

  describe('style validation', () => {
    it('returns 400 for invalid style value', async () => {
      const response = await worker.fetch(
        createRequest('/npm/react?style=invalid'),
        createEnv(),
        createCtx()
      );

      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Invalid style parameter');
      expect(getDependents).not.toHaveBeenCalled();
    });

    it('accepts style=detailed', async () => {
      vi.mocked(getDependents).mockResolvedValue({
        repos: [],
        fromCache: false,
        refreshing: false,
      });
      vi.mocked(fetchAvatars).mockResolvedValue([]);
      vi.mocked(renderMosaic).mockReturnValue('<svg></svg>');

      const response = await worker.fetch(
        createRequest('/npm/react?style=detailed'),
        createEnv(),
        createCtx()
      );

      expect(response.status).toBe(200);
      expect(renderMosaic).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ style: 'detailed' })
      );
    });

    it('accepts style=mosaic', async () => {
      vi.mocked(getDependents).mockResolvedValue({
        repos: [],
        fromCache: false,
        refreshing: false,
      });
      vi.mocked(fetchAvatars).mockResolvedValue([]);
      vi.mocked(renderMosaic).mockReturnValue('<svg></svg>');

      const response = await worker.fetch(
        createRequest('/npm/react?style=mosaic'),
        createEnv(),
        createCtx()
      );

      expect(response.status).toBe(200);
      expect(renderMosaic).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ style: 'mosaic' })
      );
    });

    it('passes undefined style when param is absent', async () => {
      vi.mocked(getDependents).mockResolvedValue({
        repos: [],
        fromCache: false,
        refreshing: false,
      });
      vi.mocked(fetchAvatars).mockResolvedValue([]);
      vi.mocked(renderMosaic).mockReturnValue('<svg></svg>');

      await worker.fetch(createRequest('/npm/react'), createEnv(), createCtx());

      expect(renderMosaic).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ style: undefined })
      );
    });
  });

  describe('sort validation', () => {
    it('returns 400 for invalid sort value', async () => {
      const response = await worker.fetch(
        createRequest('/npm/react?sort=invalid'),
        createEnv(),
        createCtx()
      );

      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Invalid sort parameter');
      expect(getDependents).not.toHaveBeenCalled();
    });

    it('sorts repos by stars descending when sort=stars', async () => {
      const repos = [
        createScoredRepo('low-stars', { stars: 50, score: 200 }),
        createScoredRepo('high-stars', { stars: 500, score: 100 }),
        createScoredRepo('mid-stars', { stars: 200, score: 150 }),
      ];

      vi.mocked(getDependents).mockResolvedValue({
        repos,
        fromCache: false,
        refreshing: false,
      });
      vi.mocked(fetchAvatars).mockResolvedValue([]);
      vi.mocked(renderMosaic).mockReturnValue('<svg></svg>');

      await worker.fetch(
        createRequest('/npm/react?sort=stars'),
        createEnv(),
        createCtx()
      );

      expect(fetchAvatars).toHaveBeenCalledWith([
        expect.objectContaining({ name: 'high-stars', stars: 500 }),
        expect.objectContaining({ name: 'mid-stars', stars: 200 }),
        expect.objectContaining({ name: 'low-stars', stars: 50 }),
      ]);
    });

    it('preserves original order when sort=score', async () => {
      const repos = [
        createScoredRepo('first', { stars: 50, score: 200 }),
        createScoredRepo('second', { stars: 500, score: 100 }),
      ];

      vi.mocked(getDependents).mockResolvedValue({
        repos,
        fromCache: false,
        refreshing: false,
      });
      vi.mocked(fetchAvatars).mockResolvedValue([]);
      vi.mocked(renderMosaic).mockReturnValue('<svg></svg>');

      await worker.fetch(
        createRequest('/npm/react?sort=score'),
        createEnv(),
        createCtx()
      );

      expect(fetchAvatars).toHaveBeenCalledWith([
        expect.objectContaining({ name: 'first' }),
        expect.objectContaining({ name: 'second' }),
      ]);
    });

    it('preserves original order when sort is absent', async () => {
      const repos = [
        createScoredRepo('first', { stars: 50, score: 200 }),
        createScoredRepo('second', { stars: 500, score: 100 }),
      ];

      vi.mocked(getDependents).mockResolvedValue({
        repos,
        fromCache: false,
        refreshing: false,
      });
      vi.mocked(fetchAvatars).mockResolvedValue([]);
      vi.mocked(renderMosaic).mockReturnValue('<svg></svg>');

      await worker.fetch(createRequest('/npm/react'), createEnv(), createCtx());

      expect(fetchAvatars).toHaveBeenCalledWith([
        expect.objectContaining({ name: 'first' }),
        expect.objectContaining({ name: 'second' }),
      ]);
    });
  });

  describe('method restriction', () => {
    it('returns 405 for POST', async () => {
      const response = await worker.fetch(
        createRequest('/npm/react', 'POST'),
        createEnv(),
        createCtx()
      );

      expect(response.status).toBe(405);
      expect(getDependents).not.toHaveBeenCalled();
    });

    it('allows HEAD requests', async () => {
      vi.mocked(getDependents).mockResolvedValue({
        repos: [],
        fromCache: false,
        refreshing: false,
      });
      vi.mocked(fetchAvatars).mockResolvedValue([]);
      vi.mocked(renderMosaic).mockReturnValue('<svg></svg>');

      const response = await worker.fetch(
        createRequest('/npm/react', 'HEAD'),
        createEnv(),
        createCtx()
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
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

    it('returns 404 for unknown platform', async () => {
      const response = await worker.fetch(
        createRequest('/pypi/react'),
        createEnv(),
        createCtx()
      );

      expect(response.status).toBe(404);
      expect(getDependents).not.toHaveBeenCalled();
    });

    it('returns 404 for missing package name', async () => {
      const response = await worker.fetch(
        createRequest('/npm/'),
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
        createRequest('/npm/react/'),
        createEnv(),
        createCtx()
      );

      expect(response.status).toBe(200);
    });

    it('returns 404 for invalid package name characters', async () => {
      const response = await worker.fetch(
        createRequest('/npm/foo%00bar'),
        createEnv(),
        createCtx()
      );

      expect(response.status).toBe(404);
      expect(getDependents).not.toHaveBeenCalled();
    });
  });
});

function createScoredRepo(
  name: string,
  overrides?: Partial<ScoredRepo>
): ScoredRepo {
  return {
    owner: 'facebook',
    name,
    fullName: `facebook/${name}`,
    stars: 100,
    lastPush: '2025-01-01T00:00:00Z',
    avatarUrl: 'https://example.com/avatar.png',
    isFork: false,
    archived: false,
    packageJsonPath: 'package.json',
    score: 95,
    ...overrides,
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
