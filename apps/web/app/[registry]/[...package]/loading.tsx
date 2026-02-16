import { ArrowDown, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';

import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function Loading() {
  return (
    <>
      <header className="mx-auto max-w-5xl px-6 pt-12 pb-8">
        <nav className="mb-8">
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            &larr; usedby.dev
          </Link>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-8 w-48 sm:h-9" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="mt-2 h-7 w-40" />
      </header>

      {/* Dependents skeleton */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-xl font-semibold text-foreground">Dependents</h2>

        <div className="mt-4 flex items-center gap-3">
          <Skeleton className="h-9 w-full sm:max-w-xs" />
          <Skeleton className="ml-auto h-9 w-21.25 rounded-md" />
        </div>

        {/* Desktop table */}
        <div className="mt-4 hidden overflow-hidden rounded-xl border border-border sm:block">
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
        <div className="mt-4 flex flex-col gap-3 sm:hidden">
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
