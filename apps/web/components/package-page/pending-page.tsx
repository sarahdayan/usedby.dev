'use client';

import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ArrowDown, ArrowUpDown, Loader2Icon } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLoadingMessage } from '@/hooks/use-loading-message';
import { useReadyNotification } from '@/hooks/use-ready-notification';
import { API_BASE } from '@/lib/api';

interface PendingPageProps {
  registry: string;
  packageName: string;
}

class PermanentError extends Error {}

async function fetcher(url: string) {
  const res = await fetch(url);

  if (res.status === 202) {
    return null;
  }

  if (res.status === 404) {
    throw new PermanentError('Package not found');
  }

  if (!res.ok) {
    throw new Error('Failed to fetch');
  }

  return res.json();
}

export function PendingPage({ registry, packageName }: PendingPageProps) {
  const router = useRouter();
  const message = useLoadingMessage();
  const notify = useReadyNotification();

  useSWR(`${API_BASE}/${registry}/${packageName}/data.json`, fetcher, {
    refreshInterval: 3_000,
    refreshWhenHidden: true,
    onSuccess(data) {
      if (data) {
        const notified = notify(() => router.refresh());

        if (!notified) {
          router.refresh();
        }
      }
    },
    onErrorRetry(error, _key, _config, revalidate, { retryCount }) {
      if (error instanceof PermanentError) {
        return;
      }
      setTimeout(() => revalidate({ retryCount }), 3_000);
    },
  });

  return (
    <>
      {/* Dependents skeleton */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-xl font-semibold text-foreground">Dependents</h2>

        <div className="mt-4 flex items-center gap-3">
          <Skeleton className="h-9 w-full sm:max-w-xs" />
          <Skeleton className="ml-auto h-9 w-21.25 rounded-md" />
        </div>

        {/* Table / cards wrapper with overlay */}
        <div className="relative mt-4">
          {/* Overlay */}
          <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center pt-12 sm:items-center sm:pt-0">
            <div className="pointer-events-auto flex flex-col items-center gap-2 rounded-lg border border-border bg-background/80 px-4 py-3 shadow-xs backdrop-blur-xs">
              <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
              <p
                key={message}
                className="animate-fade-in text-sm text-muted-foreground"
              >
                {message}
              </p>
              <p className="text-xs text-muted-foreground">
                This usually takes less than 2 minutes.
              </p>
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-border sm:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-card hover:bg-card">
                  <TableHead className="px-4">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      Repository
                      <ArrowUpDown className="size-3.5 opacity-40" />
                    </span>
                  </TableHead>
                  <TableHead className="px-4">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      Stars
                      <ArrowDown className="size-3.5" />
                    </span>
                  </TableHead>
                  <TableHead className="px-4">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      Last activity
                      <ArrowUpDown className="size-3.5 opacity-40" />
                    </span>
                  </TableHead>
                  <TableHead className="px-4 text-xs font-medium">
                    Version
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }, (_, i) => (
                  <TableRow key={i}>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Skeleton className="h-6 w-6 rounded-full" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Skeleton className="h-3.5 w-12" />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Skeleton className="h-3.5 w-24" />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Skeleton className="h-3.5 w-14" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div>
                    <span className="block text-xs font-medium text-foreground/60">
                      Stars
                    </span>
                    <Skeleton className="mt-1 h-3.5 w-10" />
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-foreground/60">
                      Activity
                    </span>
                    <Skeleton className="mt-1 h-3.5 w-16" />
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-foreground/60">
                      Version
                    </span>
                    <Skeleton className="mt-1 h-3.5 w-12" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Version chart skeleton */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-xl font-semibold text-foreground">
          Version Distribution
        </h2>
        <div className="mt-4 rounded-xl border border-border bg-card p-6">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-5 w-5/6" />
            <Skeleton className="h-5 w-1/3" />
          </div>
        </div>
      </section>
    </>
  );
}
