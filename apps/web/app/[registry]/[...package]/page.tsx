import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Footer } from '@/components/footer';
import { DependentList } from '@/components/package-page/dependent-list';
import { EmbedSnippets } from '@/components/package-page/embed-snippets';
import { PendingPage } from '@/components/package-page/pending-page';
import { TrendsPlaceholder } from '@/components/package-page/trends-placeholder';
import { VersionChart } from '@/components/package-page/version-chart';
import { ECOSYSTEMS } from '@/lib/ecosystems';
import { fetchPackageData } from '@/lib/api';

interface PageProps {
  params: Promise<{ registry: string; package: string[] }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { registry, package: segments } = await params;
  const packageName = segments.join('/');
  const ecosystem = findEcosystem(registry);

  if (!ecosystem) {
    return {};
  }

  const result = await fetchPackageData(registry, packageName);
  const count = result.status === 'ready' ? result.data.dependentCount : 0;

  return {
    title: `Projects using ${packageName} | usedby.dev`,
    description: `${count} open-source projects depend on ${packageName}. See who's using it.`,
    openGraph: {
      title: `Projects using ${packageName} | usedby.dev`,
      description: `${count} open-source projects depend on ${packageName}. See who's using it.`,
      images: [`https://api.usedby.dev/${registry}/${packageName}`],
    },
    twitter: {
      card: 'summary_large_image',
    },
  };
}

export default async function PackagePage({ params }: PageProps) {
  const { registry, package: segments } = await params;
  const packageName = segments.join('/');
  const ecosystem = findEcosystem(registry);

  if (!ecosystem) {
    notFound();
  }

  const result = await fetchPackageData(registry, packageName);

  if (result.status === 'not-found') {
    notFound();
  }

  if (result.status === 'pending') {
    return (
      <main className="min-h-screen">
        <header className="mx-auto max-w-5xl px-6 pt-12 pb-8">
          <nav className="mb-8">
            <Link
              href="/"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              &larr; usedby.dev
            </Link>
          </nav>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-2xl font-semibold text-foreground sm:text-3xl">
              {packageName}
            </h1>
            <Badge variant="secondary">{ecosystem.label}</Badge>
          </div>
          <Skeleton className="mt-2 h-6 w-40" />
        </header>

        <PendingPage registry={registry} packageName={packageName} />

        <Footer />
      </main>
    );
  }

  const { data } = result;
  const dependentCount = Math.max(data.dependentCount, data.repos.length);

  return (
    <main className="min-h-screen">
      <header className="mx-auto max-w-5xl px-6 pt-12 pb-8">
        <nav className="mb-8">
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            &larr; usedby.dev
          </Link>
        </nav>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold text-foreground sm:text-3xl">
            {packageName}
          </h1>
          <Badge variant="secondary">{ecosystem.label}</Badge>
        </div>
        <p className="mt-2 text-lg text-muted-foreground">
          {formatCount(dependentCount)} dependent
          {dependentCount !== 1 ? 's' : ''}
        </p>
      </header>

      <DependentList repos={data.repos} />
      <VersionChart versionDistribution={data.versionDistribution} />
      <EmbedSnippets platform={registry} packageName={packageName} />
      <TrendsPlaceholder />

      <Footer />
    </main>
  );
}

function findEcosystem(id: string) {
  return ECOSYSTEMS.find((ecosystem) => ecosystem.id === id);
}

function formatCount(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}
