# `@usedby.dev/worker`

Cloudflare Worker that serves the embeddable image endpoint and handles the data pipeline.

## How it works

1. **Search** — Queries GitHub code search for `package.json` files mentioning the target package
2. **Enrich** — Fetches real star counts, archive status, and avatars via GitHub GraphQL API (batched, 50 repos per request)
3. **Filter & score** — Removes forks, archived repos, and low-star projects, then ranks by `stars * recency_multiplier`
4. **Render** — Generates an SVG mosaic of dependent project avatars
5. **Cache** — Stores results in KV with stale-while-revalidate (24h fresh, 30-day eviction)

## Endpoint

```
GET /:platform/:package
```

Example: `GET /npm/dinero.js` returns an SVG image.

## Development

Create a `.dev.vars` file with your GitHub token:

```
GITHUB_TOKEN=ghp_your_token_here
```

Then start the local server:

```sh
npm run dev
```

The worker runs at [http://localhost:8787](http://localhost:8787).

To clear the local KV cache:

```sh
rm -rf .wrangler/state
```

## Deployment

```sh
npm run deploy
```

Requires `GITHUB_TOKEN` set via `wrangler secret put GITHUB_TOKEN`.

## Testing

```sh
npm test
```
