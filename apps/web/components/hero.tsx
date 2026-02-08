'use client';

import { useState } from 'react';

export function Hero() {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <section className="relative overflow-hidden">
      {/* Subtle grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="relative mx-auto max-w-5xl px-6 pb-24 pt-32 lg:pb-32 lg:pt-44">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
            Free and open source
          </div>

          {/* Headline */}
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Show the world who
            <br />
            <span className="text-accent">depends on your library</span>
          </h1>

          {/* Description */}
          <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground lg:text-xl">
            A single embeddable image that showcases your top dependents —
            avatars, names, and star counts. No API key, no sign-up, no config.
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#playground"
              className="inline-flex h-11 items-center rounded-lg bg-accent px-6 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
            >
              Try the playground
            </a>
            <a
              href="#quickstart"
              className="inline-flex h-11 items-center rounded-lg border border-border bg-card px-6 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Quick start
            </a>
          </div>

          {/* Live demo image */}
          <div className="mt-16 w-full lg:mt-20">
            <div className="relative mx-auto max-w-4xl overflow-hidden rounded-xl border border-border bg-card p-4 shadow-2xl shadow-black/5 dark:shadow-black/20 lg:p-6">
              {!imageLoaded && (
                <div className="flex h-48 items-center justify-center lg:h-64">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                </div>
              )}
              <img
                src="https://api.usedby.dev/npm/dinero.js?max=40"
                alt="Live demo showing top dependents of the dinero.js npm package including their avatars, names, and star counts"
                className={`w-full transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImageLoaded(true)}
              />
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground lg:mt-4">
                <span className="font-mono">api.usedby.dev/npm/dinero.js</span>
                <span>Live data — refreshes every 24h</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
