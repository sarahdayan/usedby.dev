# usedby.dev

**Showcase who depends on your npm package with a single image embed.**

usedby.dev generates beautiful, zero-config SVG images showing the top dependents of any npm package — perfect for your README, docs, or landing page.

![usedby.dev demo for dinero.js](https://api.usedby.dev/npm/dinero.js?max=30)

## Quick start

Add this to your README or docs, replacing `your-package` with your npm package name:

```md
[![Used by](https://api.usedby.dev/npm/your-package)](https://github.com/your-org/your-repo/network/dependents)

<sub>Made with [usedby.dev](https://usedby.dev/).</sub>
```

That's it. No API key, no sign-up, no config.

For scoped packages:

```md
[![Used by](https://api.usedby.dev/npm/@your-scope/your-package)](https://github.com/your-org/your-repo/network/dependents)

<sub>Made with [usedby.dev](https://usedby.dev/).</sub>
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

<sub>Made with [usedby.dev](https://usedby.dev/).</sub>
```

**Mosaic view with 20 dependents:**

```md
[![Used by](https://api.usedby.dev/npm/your-package?max=20)](https://github.com/your-org/your-repo/network/dependents)

<sub>Made with [usedby.dev](https://usedby.dev/).</sub>
```

## How it works

1. **Search:** Queries the GitHub code search API for repositories that import your package
2. **Enrich:** Fetches metadata (stars, activity, archived status) for each result
3. **Score:** Ranks dependents using a composite score (`stars * recency_multiplier`) to surface active, popular projects
4. **Render:** Generates an SVG image with avatars and metadata
5. **Cache:** Serves results from Cloudflare KV with stale-while-revalidate (24h fresh, background refresh, 30-day eviction)

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
