# usedby.dev

Showcase which projects depend on your library via a zero-config embeddable image.

## Project structure

This is a Turborepo monorepo with the following packages:

### Apps

- **[`apps/worker`](apps/worker)** — Cloudflare Worker serving the image endpoint and data pipeline
- **[`apps/web`](apps/web)** — Landing page (Next.js)

### Packages

- **[`packages/eslint-config`](packages/eslint-config)** — Shared ESLint configuration
- **[`packages/typescript-config`](packages/typescript-config)** — Shared TypeScript configuration

## Getting started

### Prerequisites

- Node.js >= 18
- npm 11+

### Install dependencies

```sh
npm install
```

### Set up secrets

Create `apps/worker/.dev.vars` with your GitHub token:

```
GITHUB_TOKEN=ghp_your_token_here
```

### Development

```sh
npm run dev
```

This starts both the worker (`http://localhost:8787`) and the web app (`http://localhost:3000`).

### Testing

```sh
npm test
```

### Linting and type-checking

```sh
npm run lint
npm run check-types
```

## Deployment

- **Worker** — Deployed to Cloudflare Workers via `npm run deploy -w apps/worker`
- **Web** — Deployed to Vercel
