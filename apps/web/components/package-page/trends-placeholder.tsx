import { Badge } from '@/components/ui/badge';

export function TrendsPlaceholder() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <div className="overflow-hidden rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">Trends</h2>
          <Badge variant="secondary" className="text-muted-foreground">
            Coming soon
          </Badge>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Dependent growth over time and adoption velocity will appear here as
          historical data accumulates.
        </p>

        <div className="mt-6 flex items-end gap-3" aria-hidden="true">
          <div className="h-8 w-full rounded bg-secondary/50" />
          <div className="h-14 w-full rounded bg-secondary/50" />
          <div className="h-10 w-full rounded bg-secondary/50" />
          <div className="h-20 w-full rounded bg-secondary/50" />
        </div>
      </div>
    </section>
  );
}
