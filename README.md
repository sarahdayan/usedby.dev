# usedby.dev

**Showcase who depends on your npm package with a single image embed.**

usedby.dev generates beautiful, zero-config SVG images showing the top dependents of any npm package — perfect for your README, docs, or landing page.

![usedby.dev demo for dinero.js](https://api.usedby.dev/npm/dinero.js?max=30)

## Quick start

Add this to your README or docs, replacing `your-package` with your npm package name:

```md
[![Used by](https://api.usedby.dev/npm/your-package)](https://github.com/your-org/your-repo/network/dependents)

Generated with [usedby.dev](https://usedby.dev/)
```

That's it. No API key, no sign-up, no config.

For scoped packages:

```md
[![Used by](https://api.usedby.dev/npm/@your-scope/your-package)](https://github.com/your-org/your-repo/network/dependents)

Generated with [usedby.dev](https://usedby.dev/)
```

## Customization

Append query parameters to customize the output:

| Parameter | Values                  | Default  | Description                               |
| --------- | ----------------------- | -------- | ----------------------------------------- |
| `style`   | `mosaic`, `detailed`    | `mosaic` | Display style                             |
| `max`     | `1`–`100`               | `35`     | Number of dependents to show              |
| `sort`    | `score`, `stars`        | `score`  | Sort by composite score or raw star count |
| `theme`   | `light`, `dark`, `auto` | `auto`   | Color scheme                              |

### Examples

**Detailed view with top 10 by stars, dark theme:**

```md
[![Used by](https://api.usedby.dev/npm/your-package?style=detailed&max=10&sort=stars&theme=dark)](https://github.com/your-org/your-repo/network/dependents)

Generated with [usedby.dev](https://usedby.dev/)
```

**Mosaic view with 20 dependents:**

```md
[![Used by](https://api.usedby.dev/npm/your-package?max=20)](https://github.com/your-org/your-repo/network/dependents)

Generated with [usedby.dev](https://usedby.dev/)
```

## How it works

1. **Search:** Queries the GitHub code search API for repositories that import your package
2. **Enrich:** Fetches metadata (stars, activity, archived status) for each result
3. **Score:** Ranks dependents using a composite score (`stars * recency_multiplier`) to surface active, popular projects
4. **Render:** Generates an SVG image with avatars and metadata
5. **Cache:** Serves results from Cloudflare KV with stale-while-revalidate (24h fresh, background refresh, 30-day eviction)

## FAQ

### Why does the first request take so long?

On a cold start, usedby.dev queries the GitHub code search API, enriches each result with repository metadata, fetches avatars, and renders the SVG. This involves many sequential API calls and can take a while due to the GitHub API limitations and rate limits. Subsequent requests are served from cache and are near-instant.

### Why are some well-known dependents missing?

usedby.dev relies on [GitHub's code search API](https://docs.github.com/en/rest/search/search#search-code), which caps results at 1,000 per query and doesn't allow to sort results by stars. For very popular packages with tens or hundreds of thousands of dependents, only a subset is discoverable, so some may be missing from the results.

### How fresh is the data?

Results are cached for 24 hours. After that, the next request serves stale data while triggering a background refresh. Entries not accessed for 30 days are evicted.

### Does this work with scoped packages?

Yes. Scoped packages like `@scope/package` are fully supported, just use them in the URL as-is (e.g., `https://api.usedby.dev/npm/@scope/package`).

## Self-hosting

usedby.dev is open source. You can deploy your own instance.

### Prerequisites

- Node.js >= 18
- npm 11+
- A [GitHub personal access token](https://github.com/settings/tokens)
- A [Cloudflare account](https://dash.cloudflare.com/sign-up)

### Setup

```sh
git clone https://github.com/sarahdayan/usedby.dev.git
cd usedby.dev
npm install
```

Create `apps/worker/.dev.vars` with your GitHub token:

```
GITHUB_TOKEN=ghp_your_token_here
```

### Development

```sh
npm run dev
```

This starts:

- the worker at `http://localhost:8787`
- the web app at `http://localhost:3000`
- the SVG preview at `http://localhost:5173`

### Testing

```sh
npm test
```

### Deployment

- **Worker** — Deployed to Cloudflare Workers via `npm run deploy -w apps/worker`
- **Web** — Deployed to Vercel

## Project structure

This is a [Turborepo](https://turbo.build/repo) monorepo:

- [`apps/worker`](apps/worker) — Cloudflare Worker serving the image endpoint and data pipeline
- [`apps/web`](apps/web) — Landing page (Next.js)
- [`apps/preview`](apps/preview) — SVG preview app for visual iteration on renderers

## Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

## License

[MIT](LICENSE)
