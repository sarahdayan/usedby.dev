type Env = Record<string, unknown>;

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/') {
      return new Response('usedby.dev worker', {
        headers: { 'content-type': 'text/plain' },
      });
    }

    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
