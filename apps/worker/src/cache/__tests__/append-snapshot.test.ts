import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  appendSnapshot,
  buildHistoryKey,
  buildSnapshot,
  isHistoryKey,
} from '../append-snapshot';
import type { CacheEntry } from '../types';
import type { ScoredRepo } from '../../github/types';

function createScoredRepo(overrides: Partial<ScoredRepo> = {}): ScoredRepo {
  return {
    owner: 'test',
    name: 'repo',
    fullName: 'test/repo',
    stars: 100,
    lastPush: '2025-06-01T00:00:00Z',
    avatarUrl: 'https://avatars.githubusercontent.com/u/1',
    isFork: false,
    archived: false,
    manifestPath: 'package.json',
    score: 100,
    ...overrides,
  };
}

function createEntry(
  overrides: Partial<Omit<CacheEntry, 'repos'>> & {
    repos?: Partial<ScoredRepo>[];
  } = {}
): CacheEntry {
  const { repos: repoOverrides, ...rest } = overrides;

  return {
    fetchedAt: '2025-06-01T00:00:00Z',
    lastAccessedAt: '2025-06-01T00:00:00Z',
    partial: false,
    repos: (repoOverrides ?? []).map((r) => createScoredRepo(r)),
    ...rest,
  };
}

function createKV(data: Record<string, string> = {}): KVNamespace {
  const store = new Map(Object.entries(data));

  return {
    get: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    put: vi.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
  } as unknown as KVNamespace;
}

describe('buildHistoryKey', () => {
  it('prefixes the cache key with history:', () => {
    expect(buildHistoryKey('npm:react')).toBe('history:npm:react');
  });
});

describe('isHistoryKey', () => {
  it('returns true for history keys', () => {
    expect(isHistoryKey('history:npm:react')).toBe(true);
  });

  it('returns false for cache keys', () => {
    expect(isHistoryKey('npm:react')).toBe(false);
  });

  it('returns false for lock keys', () => {
    expect(isHistoryKey('lock:npm:react')).toBe(false);
  });
});

describe('buildSnapshot', () => {
  it('builds a snapshot with date, counts, and no version distribution', () => {
    const entry = createEntry({ repos: [{}] });
    const now = new Date('2025-06-15T12:00:00Z');

    const snapshot = buildSnapshot(entry, now);

    expect(snapshot).toEqual({
      date: '2025-06-15',
      dependentCount: 1,
      repoCount: 1,
    });
  });

  it('uses dependentCount from entry when available', () => {
    const entry = createEntry({ repos: [{}, {}], dependentCount: 42 });
    const now = new Date('2025-06-15T12:00:00Z');

    const snapshot = buildSnapshot(entry, now);

    expect(snapshot.dependentCount).toBe(42);
    expect(snapshot.repoCount).toBe(2);
  });

  it('includes version distribution when repos have versions', () => {
    const entry = createEntry({
      repos: [
        { version: '^1.0.0' },
        { version: '^1.0.0' },
        { version: '^2.0.0' },
        {},
      ],
    });
    const now = new Date('2025-06-15T12:00:00Z');

    const snapshot = buildSnapshot(entry, now);

    expect(snapshot.versionDistribution).toEqual({
      '^1.0.0': 2,
      '^2.0.0': 1,
    });
  });

  it('omits version distribution when no repos have versions', () => {
    const entry = createEntry({ repos: [{}, {}] });
    const now = new Date('2025-06-15T12:00:00Z');

    const snapshot = buildSnapshot(entry, now);

    expect(snapshot.versionDistribution).toBeUndefined();
  });
});

describe('appendSnapshot', () => {
  let kv: KVNamespace;

  beforeEach(() => {
    kv = createKV();
  });

  it('creates a new history entry on first snapshot', async () => {
    const entry = createEntry({ repos: [{}], dependentCount: 10 });
    const now = new Date('2025-06-15T12:00:00Z');

    await appendSnapshot(kv, 'npm:react', entry, now);

    expect(kv.put).toHaveBeenCalledWith(
      'history:npm:react',
      expect.any(String)
    );

    const stored = JSON.parse(
      (kv.put as ReturnType<typeof vi.fn>).mock.calls[0]![1]
    );

    expect(stored.snapshots).toHaveLength(1);
    expect(stored.snapshots[0].date).toBe('2025-06-15');
    expect(stored.snapshots[0].dependentCount).toBe(10);
  });

  it('appends to existing history', async () => {
    kv = createKV({
      'history:npm:react': JSON.stringify({
        snapshots: [{ date: '2025-06-14', dependentCount: 8, repoCount: 5 }],
      }),
    });
    const entry = createEntry({ repos: [{}], dependentCount: 10 });
    const now = new Date('2025-06-15T12:00:00Z');

    await appendSnapshot(kv, 'npm:react', entry, now);

    const stored = JSON.parse(
      (kv.put as ReturnType<typeof vi.fn>).mock.calls[0]![1]
    );

    expect(stored.snapshots).toHaveLength(2);
    expect(stored.snapshots[0].date).toBe('2025-06-14');
    expect(stored.snapshots[1].date).toBe('2025-06-15');
  });

  it('replaces snapshot for the same day', async () => {
    kv = createKV({
      'history:npm:react': JSON.stringify({
        snapshots: [{ date: '2025-06-15', dependentCount: 5, repoCount: 3 }],
      }),
    });
    const entry = createEntry({ repos: [{}], dependentCount: 10 });
    const now = new Date('2025-06-15T18:00:00Z');

    await appendSnapshot(kv, 'npm:react', entry, now);

    const stored = JSON.parse(
      (kv.put as ReturnType<typeof vi.fn>).mock.calls[0]![1]
    );

    expect(stored.snapshots).toHaveLength(1);
    expect(stored.snapshots[0].dependentCount).toBe(10);
  });

  it('caps history at 365 snapshots', async () => {
    const existing = Array.from({ length: 365 }, (_, i) => ({
      date: `2025-${String(Math.floor(i / 28) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      dependentCount: i,
      repoCount: i,
    }));
    kv = createKV({
      'history:npm:react': JSON.stringify({ snapshots: existing }),
    });

    const entry = createEntry({ repos: [{}], dependentCount: 999 });
    const now = new Date('2026-01-01T00:00:00Z');

    await appendSnapshot(kv, 'npm:react', entry, now);

    const stored = JSON.parse(
      (kv.put as ReturnType<typeof vi.fn>).mock.calls[0]![1]
    );

    expect(stored.snapshots).toHaveLength(365);
    expect(stored.snapshots[364].date).toBe('2026-01-01');
    expect(stored.snapshots[364].dependentCount).toBe(999);
  });

  it('skips count-only entries', async () => {
    const entry = createEntry({ countOnly: true, repos: [] });
    const now = new Date('2025-06-15T12:00:00Z');

    await appendSnapshot(kv, 'npm:react', entry, now);

    expect(kv.get).not.toHaveBeenCalled();
    expect(kv.put).not.toHaveBeenCalled();
  });
});
