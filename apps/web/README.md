# `@usedby.dev/web`

Landing page for usedby.dev, built with Next.js 16 and Tailwind CSS.

## Development

```sh
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000).

## Production auth

A basic auth proxy (`proxy.ts`) protects the production site. Set `BASIC_AUTH_USERNAME` and `BASIC_AUTH_PASSWORD` as environment variables in Vercel to enable it. When unset (local dev), requests pass through.
