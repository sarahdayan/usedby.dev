'use client';

import { useCallback, useState } from 'react';

export function Hero() {
  const [imageLoaded, setImageLoaded] = useState(false);

  const imgRef = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete) {
      setImageLoaded(true);
    }
  }, []);

  return (
    <section className="relative overflow-hidden">
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
          <a
            href="https://github.com/sarahdayan/usedby.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <svg
              role="img"
              aria-label="GitHub"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
            Star on GitHub
          </a>

          <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Show the world who
            <br />
            <span className="text-accent">depends on your library</span>
          </h1>

          <p className="mt-6 max-w-lg text-pretty text-lg leading-relaxed text-muted-foreground lg:text-xl">
            Drop-in embeds that showcase your top dependents. No API key, no
            sign-up, no config.
          </p>

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

          <div className="mt-16 w-full lg:mt-20">
            <div className="relative mx-auto max-w-4xl overflow-hidden rounded-xl border border-border bg-card p-4 shadow-2xl shadow-black/5 dark:shadow-black/20 lg:p-6">
              {!imageLoaded && (
                <div className="flex h-48 items-center justify-center lg:h-64">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                </div>
              )}
              <img
                ref={imgRef}
                src="https://api.usedby.dev/npm/dinero.js?max=40"
                alt="Live demo showing top dependents of the dinero.js npm package including their avatars, names, and star counts"
                className={`w-full transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImageLoaded(true)}
              />
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground lg:mt-4">
                <span className="font-mono">api.usedby.dev/npm/dinero.js</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
