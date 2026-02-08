import { getDependents } from './cache/get-dependents';
import { runScheduledRefresh } from './scheduled/run-scheduled-refresh';
import { fetchAvatars } from './svg/fetch-avatars';
import { renderMessage } from './svg/render-message';
import { renderMosaic } from './svg/render-mosaic';

interface Env {
  DEPENDENTS_CACHE: KVNamespace;
  GITHUB_TOKEN: string;
}

const VALID_SEGMENT = /^[a-zA-Z0-9._-]+$/;

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

    if (
      segments.length !== 2 ||
      !VALID_SEGMENT.test(segments[0]!) ||
      !VALID_SEGMENT.test(segments[1]!)
    ) {
      return new Response('Not found', {
        status: 404,
        headers: { 'content-type': 'text/plain' },
      });
    }

    const packageName = `${segments[0]}/${segments[1]}`;
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

    try {
      const { repos } = await getDependents({
        platform: 'npm',
        packageName,
        kv: env.DEPENDENTS_CACHE,
        env: { GITHUB_TOKEN: env.GITHUB_TOKEN },
        waitUntil: ctx.waitUntil.bind(ctx),
      });

      const avatars = await fetchAvatars(repos);
      const svg = renderMosaic(avatars, { max });

      return new Response(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        },
      });
    } catch (error) {
      console.error('Pipeline error:', error);

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
