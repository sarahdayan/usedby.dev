'use client';

import { useMemo } from 'react';
import { Bar, BarChart, XAxis, YAxis } from 'recharts';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

interface VersionChartProps {
  versionDistribution: Record<string, number>;
}

const MAX_VERSIONS = 10;

const chartConfig = {
  count: {
    label: 'Dependents',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

export function VersionChart({ versionDistribution }: VersionChartProps) {
  const data = useMemo(() => {
    const entries = Object.entries(versionDistribution);

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
  }, [versionDistribution]);

  if (data.length === 0) {
    return (
      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-xl font-semibold text-foreground">
          Version Distribution
        </h2>
        <div className="mt-4 rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Version data is being collected and will appear on the next refresh
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
      <div className="mt-4 rounded-xl border border-border bg-card p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[var(--chart-height)] w-full"
          style={
            {
              '--chart-height': `${Math.max(data.length * 40, 200)}px`,
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
