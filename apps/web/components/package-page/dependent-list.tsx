'use client';

import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ArrowDown, ArrowUp, ArrowUpDown, ListFilter } from 'lucide-react';
import Link from 'next/link';
import { compare, parse } from 'semver';

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { PackageRepo } from '@/lib/api';
import { cn } from '@/lib/utils';

type SortKey = 'stars' | 'activity' | 'name' | 'version';
type SortDirection = 'asc' | 'desc';
type DepTypeFilter = 'all' | 'dependencies' | 'devDependencies';

interface DependentListProps {
  repos: PackageRepo[];
  hasDepTypes: boolean;
}

const PAGE_SIZE = 10;

export function DependentList({ repos, hasDepTypes }: DependentListProps) {
  const [sortKey, setSortKey] = useState<SortKey>('stars');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [search, setSearch] = useState('');
  const [depTypeFilter, setDepTypeFilter] = useState<DepTypeFilter>('all');
  const [hideInactive, setHideInactive] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);

  const hasInactive = repos.some((repo) => isInactive(repo));
  const hasFilters = hasDepTypes || hasInactive;
  const hasActiveFilters = depTypeFilter !== 'all' || hideInactive;

  const baseFiltered = useMemo(() => {
    let result = repos;

    if (hideInactive) {
      result = result.filter((repo) => !isInactive(repo));
    }

    const query = search.trim().toLowerCase();

    if (query) {
      result = result.filter(
        (repo) =>
          repo.fullName.toLowerCase().includes(query) ||
          repo.owner.toLowerCase().includes(query) ||
          repo.name.toLowerCase().includes(query)
      );
    }

    return result;
  }, [repos, search, hideInactive]);

  const depTypeCounts = useMemo(() => {
    if (!hasDepTypes) {
      return null;
    }

    let dependencies = 0;
    let devDependencies = 0;

    for (const repo of baseFiltered) {
      if (
        repo.depType === 'dependencies' ||
        repo.depType === 'peerDependencies' ||
        repo.depType === 'optionalDependencies'
      ) {
        dependencies++;
      } else if (repo.depType === 'devDependencies') {
        devDependencies++;
      }
    }

    return { all: baseFiltered.length, dependencies, devDependencies };
  }, [hasDepTypes, baseFiltered]);

  const activeCount = useMemo(() => {
    const active = baseFiltered.filter((repo) => !isInactive(repo));

    if (!depTypeCounts) {
      return active.length;
    }

    if (depTypeFilter === 'dependencies') {
      return active.filter(
        (repo) =>
          repo.depType === 'dependencies' ||
          repo.depType === 'peerDependencies' ||
          repo.depType === 'optionalDependencies'
      ).length;
    }
    if (depTypeFilter === 'devDependencies') {
      return active.filter((repo) => repo.depType === 'devDependencies').length;
    }

    return active.length;
  }, [baseFiltered, depTypeCounts, depTypeFilter]);

  const filtered = useMemo(() => {
    let result = baseFiltered;

    if (depTypeFilter === 'dependencies') {
      result = result.filter(
        (repo) =>
          repo.depType === 'dependencies' ||
          repo.depType === 'peerDependencies' ||
          repo.depType === 'optionalDependencies'
      );
    } else if (depTypeFilter === 'devDependencies') {
      result = result.filter((repo) => repo.depType === 'devDependencies');
    }

    return sortRepos(result, sortKey, sortDirection);
  }, [baseFiltered, sortKey, sortDirection, depTypeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function onSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function onSortChange(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'name' ? 'asc' : 'desc');
    }
    setPage(1);
  }

  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <h2 className="text-xl font-semibold text-foreground">Dependents</h2>

      <div className="mt-4 flex items-center gap-3">
        <Input
          type="search"
          placeholder="Filter dependents…"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="h-9 w-full bg-card sm:max-w-xs"
        />
        {hasFilters && (
          <DropdownMenu open={filterOpen} onOpenChange={setFilterOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  'ml-auto inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium whitespace-nowrap transition-colors',
                  hasActiveFilters
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                )}
              >
                <ListFilter className="size-4" />
                Filter
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {depTypeCounts && (
                <>
                  <DropdownMenuLabel>Dependency type</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={depTypeFilter}
                    onValueChange={(value) => {
                      setDepTypeFilter(value as DepTypeFilter);
                      setPage(1);
                    }}
                  >
                    <DropdownMenuRadioItem
                      value="all"
                      className="gap-2"
                      onSelect={(event) => event.preventDefault()}
                    >
                      All <Badge variant="secondary">{depTypeCounts.all}</Badge>
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem
                      value="dependencies"
                      className="gap-2"
                      onSelect={(event) => event.preventDefault()}
                    >
                      Dependencies{' '}
                      <Badge variant="secondary">
                        {depTypeCounts.dependencies}
                      </Badge>
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem
                      value="devDependencies"
                      className="gap-2"
                      onSelect={(event) => event.preventDefault()}
                    >
                      Dev{' '}
                      <Badge variant="secondary">
                        {depTypeCounts.devDependencies}
                      </Badge>
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </>
              )}
              {depTypeCounts && hasInactive && <DropdownMenuSeparator />}
              {hasInactive && (
                <DropdownMenuCheckboxItem
                  className="gap-2"
                  checked={hideInactive}
                  onSelect={(event) => event.preventDefault()}
                  onCheckedChange={(checked) => {
                    setHideInactive(checked === true);
                    setPage(1);
                  }}
                >
                  Active only <Badge variant="secondary">{activeCount}</Badge>
                </DropdownMenuCheckboxItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          No dependents match your filter.
        </p>
      ) : (
        <>
          <div className="mt-4 hidden overflow-hidden rounded-xl border border-border sm:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-card hover:bg-card">
                  <SortableColumnHeader
                    label="Repository"
                    sortKey="name"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={onSortChange}
                  />
                  <SortableColumnHeader
                    label="Stars"
                    sortKey="stars"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={onSortChange}
                  />
                  <SortableColumnHeader
                    label="Last activity"
                    sortKey="activity"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={onSortChange}
                  />
                  <SortableColumnHeader
                    label="Version"
                    sortKey="version"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={onSortChange}
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((repo) => (
                  <TableRow key={repo.fullName}>
                    <TableCell className="px-4 py-3">
                      <Link
                        href={`https://github.com/${repo.fullName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2.5 font-medium text-foreground transition-colors hover:text-accent"
                      >
                        <img
                          src={repo.avatarUrl}
                          alt=""
                          width={24}
                          height={24}
                          className="rounded-full"
                          loading="lazy"
                        />
                        <span className="truncate">{repo.fullName}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {formatStars(repo.stars)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                      {formatRelativeTime(repo.lastPush)}
                    </TableCell>
                    <TableCell className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {repo.version ?? '\u2014'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:hidden">
            {paginated.map((repo) => (
              <div
                key={repo.fullName}
                className="rounded-xl border border-border bg-card p-4"
              >
                <Link
                  href={`https://github.com/${repo.fullName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 font-medium text-foreground transition-colors hover:text-accent"
                >
                  <img
                    src={repo.avatarUrl}
                    alt=""
                    width={32}
                    height={32}
                    className="rounded-full"
                    loading="lazy"
                  />
                  <span className="truncate">{repo.fullName}</span>
                </Link>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div>
                    <span className="block font-medium text-foreground/60">
                      Stars
                    </span>
                    <span className="font-mono">{formatStars(repo.stars)}</span>
                  </div>
                  <div>
                    <span className="block font-medium text-foreground/60">
                      Activity
                    </span>
                    <span>{formatRelativeTime(repo.lastPush)}</span>
                  </div>
                  <div>
                    <span className="block font-medium text-foreground/60">
                      Version
                    </span>
                    <span className="font-mono">
                      {repo.version ?? '\u2014'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {(currentPage - 1) * PAGE_SIZE + 1}&ndash;
                {Math.min(currentPage * PAGE_SIZE, filtered.length)} of{' '}
                {filtered.length}
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage <= 1}
                  aria-label="Previous page"
                  className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPage((page) => Math.min(totalPages, page + 1))
                  }
                  disabled={currentPage >= totalPages}
                  aria-label="Next page"
                  className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

interface SortableColumnHeaderProps {
  label: string;
  sortKey: SortKey;
  activeSortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
  className?: string;
}

function SortableColumnHeader({
  label,
  sortKey,
  activeSortKey,
  sortDirection,
  onSort,
  className,
}: SortableColumnHeaderProps) {
  const isActive = activeSortKey === sortKey;

  return (
    <TableHead className={cn('px-4', className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        aria-sort={
          isActive
            ? sortDirection === 'asc'
              ? 'ascending'
              : 'descending'
            : undefined
        }
      >
        {label}
        {isActive ? (
          sortDirection === 'asc' ? (
            <ArrowUp className="size-3.5" />
          ) : (
            <ArrowDown className="size-3.5" />
          )
        ) : (
          <ArrowUpDown className="size-3.5 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}

const STARS_COMPACT_THRESHOLD = 10_000;

function formatStars(count: number): string {
  if (count >= STARS_COMPACT_THRESHOLD) {
    return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  }

  return new Intl.NumberFormat('en-US').format(count);
}

function formatRelativeTime(dateString: string): string {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return '\u2014';
  }
}

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function isInactive(repo: PackageRepo): boolean {
  if (repo.archived) {
    return true;
  }

  const lastPush = new Date(repo.lastPush).getTime();

  return Date.now() - lastPush > ONE_YEAR_MS;
}

function parseSemver(version: string | undefined) {
  if (!version) {
    return null;
  }

  return parse(version.replace(/^[^0-9]*/, ''));
}

function compareVersions(a: string | undefined, b: string | undefined): number {
  if (!a && !b) {
    return 0;
  }
  if (!a) {
    return 1;
  }
  if (!b) {
    return -1;
  }

  const sa = parseSemver(a);
  const sb = parseSemver(b);

  if (sa && sb) {
    return compare(sa, sb);
  }

  // Fall back to lexical comparison for non-semver versions
  return a.localeCompare(b);
}

function sortRepos(
  repos: PackageRepo[],
  key: SortKey,
  direction: SortDirection
): PackageRepo[] {
  const factor = direction === 'asc' ? 1 : -1;

  return [...repos].sort((a, b) => {
    switch (key) {
      case 'stars':
        return (a.stars - b.stars) * factor;
      case 'activity':
        return (
          (new Date(a.lastPush).getTime() - new Date(b.lastPush).getTime()) *
          factor
        );
      case 'name':
        return a.fullName.localeCompare(b.fullName) * factor;
      case 'version':
        return compareVersions(a.version, b.version) * factor;
      default:
        return 0;
    }
  });
}
