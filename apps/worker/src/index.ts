import {
  getDependentCountForBadge,
  getDependents,
} from './cache/get-dependents';
import { DevLogger } from './dev-logger';
import { getStrategy, registerStrategy } from './ecosystems';
import { checkPackageExists } from './ecosystems/check-package-exists';
import { npmStrategy } from './ecosystems/npm';
import { phpStrategy } from './ecosystems/php';
import { pythonStrategy } from './ecosystems/python';
import { rubyStrategy } from './ecosystems/ruby';
import { rustStrategy } from './ecosystems/rust';
import { goStrategy } from './ecosystems/go';
import { getLimits } from './github/pipeline-limits';
import { runScheduledRefresh } from './scheduled/run-scheduled-refresh';
import { fetchAvatars } from './svg/fetch-avatars';
import {
  buildShieldError,
  buildShieldSuccess,
  buildShieldUnavailable,
} from './shield/build-shield-response';
import { renderMessage } from './svg/render-message';
import { renderMosaic } from './svg/render-mosaic';
import type { Theme } from './svg/theme';

interface Env {
  DEPENDENTS_CACHE: KVNamespace;
  PIPELINE_QUEUE: Queue;
  GITHUB_TOKEN: string;
  DEV?: string;
}

registerStrategy(npmStrategy);
registerStrategy(phpStrategy);
registerStrategy(pythonStrategy);
registerStrategy(rubyStrategy);
registerStrategy(rustStrategy);
registerStrategy(goStrategy);

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      runScheduledRefresh(env)
        .then((result) => {
          console.log('[scheduled] Refresh complete:', JSON.stringify(result));
        })
        .catch((error) => {
          console.error('[scheduled] Refresh failed:', error);
        })
    );
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/') {
      return new Response('usedby.dev worker', {
        headers: { 'content-type': 'text/plain' },
      });
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', {
        status: 405,
        headers: { 'content-type': 'text/plain' },
      });
    }

    const segments = url.pathname.replace(/^\/+|\/+$/g, '').split('/');
    const platform = segments[0];
    const strategy = platform ? getStrategy(platform) : undefined;

    if (!strategy) {
      return new Response('Not found', {
        status: 404,
        headers: { 'content-type': 'text/plain' },
      });
    }

    const lastSegment = segments[segments.length - 1];
    const isShield = lastSegment === 'shield.json';
    const isData = lastSegment === 'data.json';
    const packageName =
      isShield || isData
        ? segments.slice(1, -1).join('/')
        : segments.slice(1).join('/');

    if (!strategy.packageNamePattern.test(packageName)) {
      return new Response('Not found', {
        status: 404,
        headers: { 'content-type': 'text/plain' },
      });
    }

    if (isShield) {
      return handleBadge(request, env, ctx, url, strategy, packageName);
    }

    if (isData) {
      return handleData(request, env, ctx, url, strategy, packageName);
    }

    const maxParam = url.searchParams.get('max');
    let max: number | undefined;

    if (maxParam !== null) {
      const parsed = parseMax(maxParam);

      if (parsed === null) {
        return new Response('Invalid max parameter', {
          status: 400,
          headers: { 'content-type': 'text/plain' },
        });
      }

      max = parsed;
    }

    const styleParam = url.searchParams.get('style');
    let style: 'mosaic' | 'detailed' | undefined;

    if (styleParam !== null) {
      if (styleParam !== 'mosaic' && styleParam !== 'detailed') {
        return new Response('Invalid style parameter', {
          status: 400,
          headers: { 'content-type': 'text/plain' },
        });
      }

      style = styleParam;
    }

    const sortParam = url.searchParams.get('sort');
    let sort: 'score' | 'stars' | undefined;

    if (sortParam !== null) {
      if (sortParam !== 'score' && sortParam !== 'stars') {
        return new Response('Invalid sort parameter', {
          status: 400,
          headers: { 'content-type': 'text/plain' },
        });
      }

      sort = sortParam;
    }

    const themeParam = url.searchParams.get('theme');
    let theme: Theme | undefined;

    if (themeParam !== null) {
      if (
        themeParam !== 'light' &&
        themeParam !== 'dark' &&
        themeParam !== 'auto'
      ) {
        return new Response('Invalid theme parameter', {
          status: 400,
          headers: { 'content-type': 'text/plain' },
        });
      }

      theme = themeParam;
    }

    const isDev = env.DEV === 'true';
    const logger = new DevLogger(isDev);
    const limits = getLimits(isDev);

    const cache = caches.default;
    const canonicalUrl = new URL(`${url.origin}/${platform}/${packageName}`);
    if (max !== undefined) {
      canonicalUrl.searchParams.set('max', String(max));
    }
    if (style !== undefined) {
      canonicalUrl.searchParams.set('style', style);
    }
    if (sort !== undefined) {
      canonicalUrl.searchParams.set('sort', sort);
    }
    if (theme !== undefined) {
      canonicalUrl.searchParams.set('theme', theme);
    }
    const cacheKey = new Request(canonicalUrl.toString(), request);

    if (!isDev) {
      const cached = await cache.match(cacheKey);
      if (cached) {
        return cached;
      }
    }

    logger.timeStart('total');
    logger.log('request', `GET /${platform}/${packageName}`);

    try {
      const { repos, dependentCount } = await getDependents({
        strategy,
        packageName,
        kv: env.DEPENDENTS_CACHE,
        env: { GITHUB_TOKEN: env.GITHUB_TOKEN },
        waitUntil: ctx.waitUntil.bind(ctx),
        logger,
        limits,
      });

      const repoList = repos ?? [];
      const sorted =
        sort === 'stars'
          ? [...repoList].sort((a, b) => b.stars - a.stars)
          : repoList;
      const displayRepos = sorted.slice(0, max ?? limits.defaultMax);

      logger.timeStart('avatars');
      const avatars = await fetchAvatars(displayRepos);
      logger.timeEnd('avatars');
      logger.log('avatars', `${avatars.length} fetched`);

      const svg = renderMosaic(avatars, { style, theme, dependentCount });

      logger.timeEnd('total');
      logger.summary();

      const response = new Response(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        },
      });
      if (!isDev) {
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
      }

      return response;
    } catch (error) {
      console.error('Pipeline error:', error);

      logger.timeEnd('total');
      logger.summary();

      return new Response(renderMessage('Something went wrong', theme), {
        status: 500,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-store',
        },
      });
    }
  },
} satisfies ExportedHandler<Env>;

async function handleBadge(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  url: URL,
  strategy: ReturnType<typeof getStrategy> & {},
  packageName: string
): Promise<Response> {
  const isDev = env.DEV === 'true';
  const logger = new DevLogger(isDev);
  const limits = getLimits(isDev);

  const cache = caches.default;
  const canonicalUrl = new URL(
    `${url.origin}/${strategy.platform}/${packageName}/shield.json`
  );
  const cacheKey = new Request(canonicalUrl.toString(), request);

  if (!isDev) {
    const cached = await cache.match(cacheKey);
    if (cached) {
      return cached;
    }
  }

  try {
    const { count } = await getDependentCountForBadge({
      strategy,
      packageName,
      kv: env.DEPENDENTS_CACHE,
      env: { GITHUB_TOKEN: env.GITHUB_TOKEN },
      waitUntil: ctx.waitUntil.bind(ctx),
      logger,
      limits,
    });

    const body =
      count != null ? buildShieldSuccess(count) : buildShieldUnavailable();

    const response = new Response(JSON.stringify(body), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });

    if (!isDev) {
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }

    return response;
  } catch (error) {
    console.error('Badge error:', error);

    return new Response(JSON.stringify(buildShieldError()), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }
}

async function handleData(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  url: URL,
  strategy: ReturnType<typeof getStrategy> & {},
  packageName: string
): Promise<Response> {
  const isDev = env.DEV === 'true';
  const logger = new DevLogger(isDev);
  const limits = getLimits(isDev);

  const cache = caches.default;
  const canonicalUrl = new URL(
    `${url.origin}/${strategy.platform}/${packageName}/data.json`
  );
  const cacheKey = new Request(canonicalUrl.toString(), request);

  if (!isDev) {
    const cached = await cache.match(cacheKey);
    if (cached) {
      return cached;
    }
  }

  try {
    const { repos, dependentCount } = await getDependents({
      strategy,
      packageName,
      kv: env.DEPENDENTS_CACHE,
      env: { GITHUB_TOKEN: env.GITHUB_TOKEN },
      waitUntil: ctx.waitUntil.bind(ctx),
      logger,
      limits,
      existenceCheck: () => checkPackageExists(strategy, packageName),
    });

    if (repos === null) {
      return jsonResponse({ error: 'Package not found' }, 404);
    }

    const versionDistribution: Record<string, number> = {};

    for (const repo of repos) {
      const version = repo.version;
      if (version) {
        versionDistribution[version] = (versionDistribution[version] ?? 0) + 1;
      }
    }

    const body = {
      package: packageName,
      platform: strategy.platform,
      dependentCount: dependentCount ?? repos.length,
      fetchedAt: new Date().toISOString(),
      repos: repos.map((r) => ({
        fullName: r.fullName,
        owner: r.owner,
        name: r.name,
        stars: r.stars,
        lastPush: r.lastPush,
        avatarUrl: r.avatarUrl,
        score: r.score,
        ...(r.version != null && { version: r.version }),
      })),
      versionDistribution,
    };

    const response = jsonResponse(body, 200, {
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    });

    if (!isDev) {
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }

    return response;
  } catch (error) {
    console.error('Data endpoint error:', error);

    return jsonResponse({ error: 'Something went wrong' }, 500, {
      'Cache-Control': 'no-store',
    });
  }
}

function jsonResponse(
  body: unknown,
  status: number,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      ...extraHeaders,
    },
  });
}

function parseMax(value: string): number | null {
  const num = Number(value);

  if (!Number.isInteger(num) || num < 1) {
    return null;
  }

  return num;
}
