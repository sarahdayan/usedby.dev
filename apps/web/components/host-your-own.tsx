import {
  SearchIcon,
  DatabaseIcon,
  BarChart3Icon,
  ImageIcon,
  ZapIcon,
} from 'lucide-react';

const steps = [
  {
    icon: SearchIcon,
    title: 'Search',
    description:
      'Query GitHub to discover projects that list yours as a dependency.',
  },
  {
    icon: DatabaseIcon,
    title: 'Enrich',
    description:
      'Fetch metadata for each dependent: repository, stars, last push, and avatar.',
  },
  {
    icon: BarChart3Icon,
    title: 'Score',
    description:
      'Rank dependents by a composite score combining star count and recent activity.',
  },
  {
    icon: ImageIcon,
    title: 'Render',
    description:
      'Generate a crisp SVG image on the fly with avatars, names, and star counts.',
  },
  {
    icon: ZapIcon,
    title: 'Cache',
    description: 'Cache results and serve fresh ones every 24 hours.',
  },
];

export function HostYourOwn() {
  return (
    <section className="relative mx-auto max-w-5xl px-6 py-24 lg:py-32">
      <div className="flex flex-col items-center">
        <p className="text-sm font-medium uppercase tracking-widest text-accent">
          Open source
        </p>
        <h2 className="mt-4 text-balance text-center text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Host your own
        </h2>
        <p className="mt-4 max-w-2xl text-center text-lg leading-relaxed text-muted-foreground">
          Deploy as a Cloudflare Worker and handle the pipeline in a single
          request.
        </p>
      </div>

      <div className="mt-16 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((step, index) => (
          <div
            key={step.title}
            className="relative flex flex-col gap-3 bg-card p-6"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                <step.icon className="h-4 w-4 text-accent" />
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                {String(index + 1).padStart(2, '0')}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              {step.title}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {step.description}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-16 flex flex-col items-center">
        <a
          href="https://github.com/sarahdayan/usedby.dev/fork"
          className="inline-flex h-11 items-center gap-3 rounded-lg border border-border bg-card px-6 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          <svg
            role="img"
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
          </svg>
          Fork the repository
        </a>
      </div>
    </section>
  );
}
