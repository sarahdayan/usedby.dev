import { getDependents } from './cache/get-dependents';
import { DevLogger } from './dev-logger';
import { getLimits } from './github/pipeline-limits';
import { runScheduledRefresh } from './scheduled/run-scheduled-refresh';
import { DEFAULT_MAX } from './svg/constants';
import { fetchAvatars } from './svg/fetch-avatars';
import { renderMessage } from './svg/render-message';
import { renderMosaic } from './svg/render-mosaic';

interface Env {
  DEPENDENTS_CACHE: KVNamespace;
  GITHUB_TOKEN: string;
  DEV?: string;
}

const SUPPORTED_PLATFORMS = ['npm'] as const;
const NPM_PACKAGE_NAME = /^(@[a-zA-Z0-9._-]+\/)?[a-zA-Z0-9._-]+$/;

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

    if (
      !platform ||
      !SUPPORTED_PLATFORMS.includes(
        platform as (typeof SUPPORTED_PLATFORMS)[number]
      )
    ) {
      return new Response('Not found', {
        status: 404,
        headers: { 'content-type': 'text/plain' },
      });
    }

    const packageName = segments.slice(1).join('/');

    if (!NPM_PACKAGE_NAME.test(packageName)) {
      return new Response('Not found', {
        status: 404,
        headers: { 'content-type': 'text/plain' },
      });
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

    const isDev = env.DEV === 'true';
    const logger = new DevLogger(isDev);
    const limits = getLimits(isDev);
    logger.time('total');
    logger.log('request', `GET /${platform}/${packageName}`);

    try {
      const { repos } = await getDependents({
        platform: 'npm',
        packageName,
        kv: env.DEPENDENTS_CACHE,
        env: { GITHUB_TOKEN: env.GITHUB_TOKEN },
        waitUntil: ctx.waitUntil.bind(ctx),
        logger,
        limits,
      });

      const displayRepos = repos.slice(0, max ?? DEFAULT_MAX);

      logger.time('avatars');
      const avatars = await fetchAvatars(displayRepos);
      logger.timeEnd('avatars');
      logger.log('avatars', `${avatars.length} fetched`);

      const svg = renderMosaic(avatars, { style });

      logger.timeEnd('total');
      logger.summary();

      return new Response(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        },
      });
    } catch (error) {
      console.error('Pipeline error:', error);

      logger.timeEnd('total');
      logger.summary();

      return new Response(renderMessage('Something went wrong'), {
        status: 500,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-store',
        },
      });
    }
  },
} satisfies ExportedHandler<Env>;

function parseMax(value: string): number | null {
  const num = Number(value);

  if (!Number.isInteger(num) || num < 1) {
    return null;
  }

  return num;
}
