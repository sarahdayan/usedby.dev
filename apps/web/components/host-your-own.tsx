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
    </section>
  );
}
