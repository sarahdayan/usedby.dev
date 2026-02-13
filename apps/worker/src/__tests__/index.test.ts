import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { npmStrategy } from '../ecosystems/npm';
import type { ScoredRepo } from '../github/types';

const mockCache = {
  match: vi.fn() as ReturnType<typeof vi.fn>,
  put: vi.fn() as ReturnType<typeof vi.fn>,
};

vi.stubGlobal('caches', { default: mockCache });

vi.mock('../cache/get-dependents', () => ({
  getDependents: vi.fn(),
  getDependentCountForBadge: vi.fn(),
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

vi.mock('../queue/handle-pipeline-message', () => ({
  handlePipelineMessage: vi.fn(),
}));

import {
  getDependentCountForBadge,
  getDependents,
} from '../cache/get-dependents';
import { PROD_LIMITS } from '../github/pipeline-limits';
import { handlePipelineMessage } from '../queue/handle-pipeline-message';
import { runScheduledRefresh } from '../scheduled/run-scheduled-refresh';
import { fetchAvatars } from '../svg/fetch-avatars';
import { renderMessage } from '../svg/render-message';
import { renderMosaic } from '../svg/render-mosaic';
import worker from '../index';

beforeEach(() => {
  mockCache.match.mockResolvedValue(undefined);
  mockCache.put.mockResolvedValue(undefined);
});

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

  describe('queue', () => {
    it('acks message on success', async () => {
      vi.mocked(handlePipelineMessage).mockResolvedValue();

      const message = createQueueMessage({
        platform: 'npm',
        packageName: 'react',
        enqueuedAt: new Date().toISOString(),
      });
      const batch = createBatch([message]);

      await worker.queue!(batch, createEnv());

      expect(handlePipelineMessage).toHaveBeenCalledWith(
        message.body,
        expect.anything()
      );
      expect(message.ack).toHaveBeenCalled();
      expect(message.retry).not.toHaveBeenCalled();
    });

    it('retries message on failure', async () => {
      vi.mocked(handlePipelineMessage).mockRejectedValue(
        new Error('Pipeline failed')
      );
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const message = createQueueMessage({
        platform: 'npm',
        packageName: 'react',
        enqueuedAt: new Date().toISOString(),
      });
      const batch = createBatch([message]);

      await worker.queue!(batch, createEnv());

      expect(message.ack).not.toHaveBeenCalled();
      expect(message.retry).toHaveBeenCalledWith({ delaySeconds: 30 });
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
          strategy: npmStrategy,
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
          strategy: npmStrategy,
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
        expect(renderMessage).toHaveBeenCalledWith(
          'Something went wrong',
          undefined
        );
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
        expect(renderMessage).toHaveBeenCalledWith(
          'Something went wrong',
          undefined
        );
      } finally {
        consoleSpy.mockRestore();
      }
    });

    it('forwards dependentCount to renderMosaic', async () => {
      vi.mocked(getDependents).mockResolvedValue({
        repos: [],
        fromCache: false,
        refreshing: false,
        dependentCount: 42000,
      });
      vi.mocked(fetchAvatars).mockResolvedValue([]);
      vi.mocked(renderMosaic).mockReturnValue('<svg></svg>');

      await worker.fetch(createRequest('/npm/react'), createEnv(), createCtx());

      expect(renderMosaic).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ dependentCount: 42000 })
      );
    });

    it('forwards undefined dependentCount when not present', async () => {
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
        expect.objectContaining({ dependentCount: undefined })
      );
    });

    it('passes theme to renderMessage on error', async () => {
      vi.mocked(getDependents).mockRejectedValue(new Error('API failure'));
      vi.mocked(renderMessage).mockReturnValue(
        '<svg xmlns="http://www.w3.org/2000/svg">Something went wrong</svg>'
      );
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      try {
        await worker.fetch(
          createRequest('/npm/react?theme=dark'),
          createEnv(),
          createCtx()
        );

        expect(renderMessage).toHaveBeenCalledWith(
          'Something went wrong',
          'dark'
        );
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

  describe('theme validation', () => {
    it('returns 400 for invalid theme value', async () => {
      const response = await worker.fetch(
        createRequest('/npm/react?theme=invalid'),
        createEnv(),
        createCtx()
      );

      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Invalid theme parameter');
      expect(getDependents).not.toHaveBeenCalled();
    });

    it('passes theme=dark to renderMosaic', async () => {
      vi.mocked(getDependents).mockResolvedValue({
        repos: [],
        fromCache: false,
        refreshing: false,
      });
      vi.mocked(fetchAvatars).mockResolvedValue([]);
      vi.mocked(renderMosaic).mockReturnValue('<svg></svg>');

      const response = await worker.fetch(
        createRequest('/npm/react?theme=dark'),
        createEnv(),
        createCtx()
      );

      expect(response.status).toBe(200);
      expect(renderMosaic).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ theme: 'dark' })
      );
    });

    it('passes undefined theme when param is absent', async () => {
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
        expect.objectContaining({ theme: undefined })
      );
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
        createRequest('/unknown/react'),
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

  describe('GET /:platform/:package/shield.json', () => {
    it('returns Shields.io JSON with count', async () => {
      vi.mocked(getDependentCountForBadge).mockResolvedValue({
        count: 42,
        fromCache: false,
      });

      const response = await worker.fetch(
        createRequest('/npm/react/shield.json'),
        createEnv(),
        createCtx()
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Cache-Control')).toBe(
        'public, max-age=86400, s-maxage=86400'
      );

      const body = await response.json();
      expect(body).toEqual({
        schemaVersion: 1,
        label: 'used by',
        message: '42 projects',
        color: 'brightgreen',
      });
    });

    it('returns unavailable when count is null', async () => {
      vi.mocked(getDependentCountForBadge).mockResolvedValue({
        count: null,
        fromCache: false,
      });

      const response = await worker.fetch(
        createRequest('/npm/react/shield.json'),
        createEnv(),
        createCtx()
      );

      const body = await response.json();
      expect(body).toEqual({
        schemaVersion: 1,
        label: 'used by',
        message: 'unavailable',
        color: 'lightgrey',
      });
    });

    it('returns error JSON on pipeline failure', async () => {
      vi.mocked(getDependentCountForBadge).mockRejectedValue(
        new Error('API error')
      );
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      try {
        const response = await worker.fetch(
          createRequest('/npm/react/shield.json'),
          createEnv(),
          createCtx()
        );

        expect(response.headers.get('Content-Type')).toBe('application/json');
        expect(response.headers.get('Cache-Control')).toBe('no-store');

        const body = await response.json();
        expect(body).toEqual({
          schemaVersion: 1,
          label: 'used by',
          message: 'error',
          color: 'red',
          isError: true,
        });
      } finally {
        consoleSpy.mockRestore();
      }
    });

    it('routes scoped npm packages correctly', async () => {
      vi.mocked(getDependentCountForBadge).mockResolvedValue({
        count: 10,
        fromCache: false,
      });

      const response = await worker.fetch(
        createRequest('/npm/@algolia/autocomplete-core/shield.json'),
        createEnv(),
        createCtx()
      );

      expect(response.status).toBe(200);
      expect(getDependentCountForBadge).toHaveBeenCalledWith(
        expect.objectContaining({
          strategy: npmStrategy,
          packageName: '@algolia/autocomplete-core',
        })
      );
    });

    it('routes multi-segment Go packages correctly', async () => {
      vi.mocked(getDependentCountForBadge).mockResolvedValue({
        count: 200,
        fromCache: false,
      });

      const response = await worker.fetch(
        createRequest('/go/gorilla/mux/shield.json'),
        createEnv(),
        createCtx()
      );

      expect(response.status).toBe(200);
      expect(getDependentCountForBadge).toHaveBeenCalledWith(
        expect.objectContaining({
          packageName: 'gorilla/mux',
        })
      );
    });

    it('does not call getDependents for badge requests', async () => {
      vi.mocked(getDependentCountForBadge).mockResolvedValue({
        count: 5,
        fromCache: false,
      });

      await worker.fetch(
        createRequest('/npm/react/shield.json'),
        createEnv(),
        createCtx()
      );

      expect(getDependents).not.toHaveBeenCalled();
      expect(fetchAvatars).not.toHaveBeenCalled();
    });

    it('returns 404 for unknown platform with shield.json', async () => {
      const response = await worker.fetch(
        createRequest('/unknown/react/shield.json'),
        createEnv(),
        createCtx()
      );

      expect(response.status).toBe(404);
    });
  });

  describe('edge cache', () => {
    it('returns cached response on cache hit', async () => {
      const cachedResponse = new Response('<svg>cached</svg>', {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        },
      });
      mockCache.match.mockResolvedValue(cachedResponse);

      const response = await worker.fetch(
        createRequest('/npm/react'),
        createEnv(),
        createCtx()
      );

      expect(response).toBe(cachedResponse);
      expect(getDependents).not.toHaveBeenCalled();
      expect(mockCache.put).not.toHaveBeenCalled();
    });

    it('runs pipeline and calls cache.put on cache miss', async () => {
      vi.mocked(getDependents).mockResolvedValue({
        repos: [],
        fromCache: false,
        refreshing: false,
      });
      vi.mocked(fetchAvatars).mockResolvedValue([]);
      vi.mocked(renderMosaic).mockReturnValue('<svg>fresh</svg>');
      const ctx = createCtx();

      const response = await worker.fetch(
        createRequest('/npm/react'),
        createEnv(),
        ctx
      );

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('<svg>fresh</svg>');
      expect(getDependents).toHaveBeenCalled();
      expect(mockCache.put).toHaveBeenCalledWith(
        expect.any(Request),
        expect.any(Response)
      );
      expect(ctx.waitUntil).toHaveBeenCalled();
    });

    it('does not call cache.put on pipeline error', async () => {
      vi.mocked(getDependents).mockRejectedValue(new Error('API failure'));
      vi.mocked(renderMessage).mockReturnValue('<svg>error</svg>');
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      try {
        await worker.fetch(
          createRequest('/npm/react'),
          createEnv(),
          createCtx()
        );

        expect(mockCache.put).not.toHaveBeenCalled();
      } finally {
        consoleSpy.mockRestore();
      }
    });

    it('normalizes query param order for cache key', async () => {
      const cachedResponse = new Response('<svg>cached</svg>', {
        headers: { 'Content-Type': 'image/svg+xml' },
      });
      mockCache.match.mockResolvedValue(cachedResponse);

      await worker.fetch(
        createRequest('/npm/react?theme=dark&style=mosaic'),
        createEnv(),
        createCtx()
      );

      await worker.fetch(
        createRequest('/npm/react?style=mosaic&theme=dark'),
        createEnv(),
        createCtx()
      );

      const firstUrl = (mockCache.match.mock.calls[0]![0] as Request).url;
      const secondUrl = (mockCache.match.mock.calls[1]![0] as Request).url;

      expect(firstUrl).toBe(secondUrl);
    });

    it('strips unknown query params from cache key', async () => {
      const cachedResponse = new Response('<svg>cached</svg>', {
        headers: { 'Content-Type': 'image/svg+xml' },
      });
      mockCache.match.mockResolvedValue(cachedResponse);

      await worker.fetch(
        createRequest('/npm/react?max=10'),
        createEnv(),
        createCtx()
      );

      await worker.fetch(
        createRequest('/npm/react?max=10&_bust=123'),
        createEnv(),
        createCtx()
      );

      const firstUrl = (mockCache.match.mock.calls[0]![0] as Request).url;
      const secondUrl = (mockCache.match.mock.calls[1]![0] as Request).url;

      expect(firstUrl).toBe(secondUrl);
    });

    it('skips cache.match in dev mode', async () => {
      vi.mocked(getDependents).mockResolvedValue({
        repos: [],
        fromCache: false,
        refreshing: false,
      });
      vi.mocked(fetchAvatars).mockResolvedValue([]);
      vi.mocked(renderMosaic).mockReturnValue('<svg></svg>');

      await worker.fetch(
        createRequest('/npm/react'),
        createEnv({ DEV: 'true' }),
        createCtx()
      );

      expect(mockCache.match).not.toHaveBeenCalled();
      expect(mockCache.put).not.toHaveBeenCalled();
      expect(getDependents).toHaveBeenCalled();
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
    manifestPath: 'package.json',
    score: 95,
    ...overrides,
  };
}

function createEnv(overrides?: { DEV?: string }) {
  return {
    DEPENDENTS_CACHE: {} as KVNamespace,
    PIPELINE_QUEUE: { send: vi.fn() } as unknown as Queue,
    GITHUB_TOKEN: 'fake-token',
    ...overrides,
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

function createQueueMessage(body: {
  platform: string;
  packageName: string;
  enqueuedAt: string;
}) {
  return {
    body,
    id: 'msg-1',
    timestamp: new Date(),
    ack: vi.fn(),
    retry: vi.fn(),
  } as unknown as Message;
}

function createBatch(messages: Message[]) {
  return {
    messages,
    queue: 'usedby-pipeline',
    ackAll: vi.fn(),
    retryAll: vi.fn(),
  } as unknown as MessageBatch;
}
