import type { ScoredRepo } from '../github/types';

export interface CacheEntry {
  repos: ScoredRepo[];
  fetchedAt: string;
  lastAccessedAt: string;
  partial: boolean;
}

export type CacheResult =
  | { status: 'hit'; entry: CacheEntry }
  | { status: 'stale'; entry: CacheEntry }
  | { status: 'miss'; entry: null };
