# CLAUDE.md

## Project

usedby.dev — a hosted service that lets open-source maintainers showcase which projects depend on their library via a zero-config embeddable image.

## Tech stack

- Turborepo monorepo
- Cloudflare Workers + KV for the API/image serving
- GitHub code search API (`search/code`) as data source

## Packages

- `worker` — Cloudflare Worker serving the image endpoint and handling data pipeline
- `web` — Landing page

## Key design decisions

- No database or queue system — KV storage only
- Stale-while-revalidate caching (24h fresh, serve stale + background refresh, 30-day eviction)
- Star-tier partitioned queries to work around GitHub's 1,000 result cap
- Composite scoring: `stars * recency_multiplier` (not pure star count)
- Noise filtering: exclude forks, zero-star repos, devDependencies-only

## Commits

- Follow the [Conventional Commits](https://www.conventionalcommits.org/) convention

## Linear

- Team: Sarahdayan
- Project: UsedBy.dev
