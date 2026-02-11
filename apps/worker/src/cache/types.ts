import type { ScoredRepo } from '../github/types';

export interface CacheMetadata {
  fetchedAt: string;
  lastAccessedAt: string;
  partial: boolean;
  countOnly?: boolean;
}

export interface CacheEntry extends CacheMetadata {
  repos: ScoredRepo[];
  dependentCount?: number;
}

export type CacheResult =
  | { status: 'hit'; entry: CacheEntry }
  | { status: 'stale'; entry: CacheEntry }
  | { status: 'miss'; entry: null };
