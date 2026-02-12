'use client';

import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

import { ToggleGroup } from '@/components/toggle-group';
import { Input } from '@/components/ui/input';
import type { PackageRepo } from '@/lib/api';

type SortKey = 'score' | 'stars' | 'activity' | 'name';

interface DependentListProps {
  repos: PackageRepo[];
}

const sortOptions: { label: string; value: SortKey }[] = [
  { label: 'Score', value: 'score' },
  { label: 'Stars', value: 'stars' },
  { label: 'Activity', value: 'activity' },
  { label: 'Name', value: 'name' },
];

function formatStars(count: number): string {
  if (count >= 10_000) {
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

function sortRepos(repos: PackageRepo[], key: SortKey): PackageRepo[] {
  return [...repos].sort((a, b) => {
    switch (key) {
      case 'score':
        return b.score - a.score;
      case 'stars':
        return b.stars - a.stars;
      case 'activity':
        return new Date(b.lastPush).getTime() - new Date(a.lastPush).getTime();
      case 'name':
        return a.fullName.localeCompare(b.fullName);
      default:
        return 0;
    }
  });
}

export function DependentList({ repos }: DependentListProps) {
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return sortRepos(repos, sortKey);
    }

    return sortRepos(
      repos.filter(
        (repo) =>
          repo.fullName.toLowerCase().includes(query) ||
          repo.owner.toLowerCase().includes(query) ||
          repo.name.toLowerCase().includes(query)
      ),
      sortKey
    );
  }, [repos, sortKey, search]);

  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <h2 className="text-xl font-semibold text-foreground">Dependents</h2>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          type="search"
          placeholder="Filter dependents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full bg-card sm:max-w-xs"
        />
        <ToggleGroup
          options={sortOptions}
          value={sortKey}
          onChange={setSortKey}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          No dependents match your filter.
        </p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="mt-4 hidden overflow-hidden rounded-xl border border-border sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Repository</th>
                  <th className="px-4 py-3 font-medium">Stars</th>
                  <th className="px-4 py-3 font-medium">Last activity</th>
                  <th className="px-4 py-3 font-medium">Version</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((repo) => (
                  <tr
                    key={repo.fullName}
                    className="border-b border-border last:border-b-0 transition-colors hover:bg-card/60"
                  >
                    <td className="px-4 py-3">
                      <a
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
                      </a>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {formatStars(repo.stars)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatRelativeTime(repo.lastPush)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {repo.version ?? '\u2014'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="mt-4 flex flex-col gap-3 sm:hidden">
            {filtered.map((repo) => (
              <div
                key={repo.fullName}
                className="rounded-xl border border-border bg-card p-4"
              >
                <a
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
                </a>
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
        </>
      )}
    </section>
  );
}
