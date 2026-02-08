# `@usedby.dev/preview`

A lightweight Vite dev app for visually iterating on the SVG renderers before deploying.

## Usage

From the monorepo root:

```sh
npx turbo dev --filter=@usedby.dev/preview
```

## Controls

- **Style** — switch between mosaic and detailed renderers
- **Avatars** — adjust count from 0 (empty state) to 100
- **Badge** — toggle the dependent count badge
- **Dependent count** — set the number shown in the badge
- **Expand** — click the button in a pane's header to go full-width

Both light and dark themes render side-by-side inside isolated iframes, so their styles don't interfere with each other.

## How it works

The app imports the renderers directly from `apps/worker/src/svg/` via a Vite path alias (`@svg`). No changes to the worker package are needed. Mock data uses real GitHub avatar URLs and realistic repo metadata — no API calls required.
