'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, XAxis, YAxis } from 'recharts';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { cn } from '@/lib/utils';

interface VersionChartProps {
  versionDistribution: Record<string, number>;
}

const MAX_VERSIONS = 10;
const BAR_HEIGHT = 40;
const MIN_CHART_HEIGHT = 200;

const CHART_CONFIG = {
  count: {
    label: 'Dependents',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

export function VersionChart({ versionDistribution }: VersionChartProps) {
  const [selectedMajor, setSelectedMajor] = useState<string | null>(null);

  const majorData = useMemo(() => {
    const groups = new Map<string, number>();

    for (const [version, count] of Object.entries(versionDistribution)) {
      const major = getMajorVersion(version);

      groups.set(major, (groups.get(major) ?? 0) + count);
    }

    return getChartData(
      [...groups.entries()].map(([major, count]) => [`v${major}.x`, count])
    );
  }, [versionDistribution]);

  const drillDownData = useMemo(() => {
    if (!selectedMajor) {
      return [];
    }

    const entries = Object.entries(versionDistribution).filter(
      ([version]) => getMajorVersion(version) === selectedMajor
    );

    return getChartData(entries);
  }, [versionDistribution, selectedMajor]);

  const data = selectedMajor ? drillDownData : majorData;

  if (majorData.length === 0) {
    return (
      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-xl font-semibold text-foreground">
          Version Distribution
        </h2>
        <div className="mt-4 rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Version data is being collected and will appear on the next refresh.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <h2 className="text-xl font-semibold text-foreground">
        Version Distribution
      </h2>
      {majorData.length > 1 && (
        <div className="mt-4 inline-flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedMajor(null)}
            aria-pressed={selectedMajor === null}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-all',
              selectedMajor === null
                ? 'bg-secondary text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            All
          </button>
          {majorData.map(({ version }) => {
            const major = version.replace(/^v/, '').replace(/\.x$/, '');

            return (
              <button
                key={version}
                type="button"
                onClick={() => setSelectedMajor(major)}
                aria-pressed={selectedMajor === major}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium font-mono transition-all',
                  selectedMajor === major
                    ? 'bg-secondary text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {version}
              </button>
            );
          })}
        </div>
      )}
      <div className="mt-4 rounded-xl border border-border bg-card p-6">
        <ChartContainer
          config={CHART_CONFIG}
          className="aspect-auto h-(--chart-height) w-full"
          style={
            {
              '--chart-height': `${Math.max(data.length * BAR_HEIGHT, MIN_CHART_HEIGHT)}px`,
            } as React.CSSProperties
          }
        >
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 24, bottom: 0, left: 0 }}
          >
            <YAxis
              dataKey="version"
              type="category"
              tickLine={false}
              axisLine={false}
              width={120}
              tick={{
                className: 'font-mono fill-muted-foreground text-xs',
              }}
            />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar
              dataKey="count"
              fill="var(--color-count)"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ChartContainer>
      </div>
    </section>
  );
}

function getMajorVersion(version: string): string {
  const match = version.match(/(\d+)/);

  return match?.[1] ?? version;
}

function getChartData(entries: [string, number][]) {
  if (entries.length === 0) {
    return [];
  }

  const sorted = entries.sort(([, a], [, b]) => b - a);

  if (sorted.length <= MAX_VERSIONS) {
    return sorted.map(([version, count]) => ({ version, count }));
  }

  const top = sorted.slice(0, MAX_VERSIONS);
  const rest = sorted.slice(MAX_VERSIONS);
  const otherCount = rest.reduce((sum, [, count]) => sum + count, 0);

  return [
    ...top.map(([version, count]) => ({ version, count })),
    { version: 'Other', count: otherCount },
  ];
}
