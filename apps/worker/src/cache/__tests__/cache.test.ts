import { describe, expect, it, vi } from 'vitest';

import {
  buildCacheKey,
  FRESH_TTL_MS,
  readCache,
  touchLastAccessed,
  writeCache,
} from '../cache';
import type { CacheEntry } from '../types';

const NOW = new Date('2025-01-15T12:00:00Z');

describe('buildCacheKey', () => {
  it('formats platform and package name', () => {
    expect(buildCacheKey('npm', 'react')).toBe('npm:react');
  });

  it('handles scoped package names', () => {
    expect(buildCacheKey('npm', '@algolia/autocomplete-core')).toBe(
      'npm:@algolia/autocomplete-core'
    );
  });
});

describe('readCache', () => {
  it('returns miss when key does not exist', async () => {
    const kv = createMockKV();

    const result = await readCache(kv, 'npm:react', NOW);

    expect(result).toEqual({ status: 'miss', entry: null });
  });

  it('returns hit when entry is fresh (< 24h)', async () => {
    const entry = createEntry({ fetchedAt: '2025-01-15T10:00:00Z' });
    const kv = createMockKV({ 'npm:react': JSON.stringify(entry) });

    const result = await readCache(kv, 'npm:react', NOW);

    expect(result.status).toBe('hit');
    expect(result.entry).toEqual(entry);
  });

  it('returns stale when entry is >= 24h old', async () => {
    const entry = createEntry({ fetchedAt: '2025-01-14T12:00:00Z' });
    const kv = createMockKV({ 'npm:react': JSON.stringify(entry) });

    const result = await readCache(kv, 'npm:react', NOW);

    expect(result.status).toBe('stale');
    expect(result.entry).toEqual(entry);
  });

  it('treats exactly 24h as stale', async () => {
    const fetchedAt = new Date(NOW.getTime() - FRESH_TTL_MS).toISOString();
    const entry = createEntry({ fetchedAt });
    const kv = createMockKV({ 'npm:react': JSON.stringify(entry) });

    const result = await readCache(kv, 'npm:react', NOW);

    expect(result.status).toBe('stale');
  });

  it('treats 24h - 1ms as hit', async () => {
    const fetchedAt = new Date(NOW.getTime() - FRESH_TTL_MS + 1).toISOString();
    const entry = createEntry({ fetchedAt });
    const kv = createMockKV({ 'npm:react': JSON.stringify(entry) });

    const result = await readCache(kv, 'npm:react', NOW);

    expect(result.status).toBe('hit');
  });
});

describe('writeCache', () => {
  it('calls kv.put with JSON-serialized entry and metadata', async () => {
    const kv = createMockKV();
    const entry = createEntry();

    await writeCache(kv, 'npm:react', entry);

    expect(kv.put).toHaveBeenCalledWith('npm:react', JSON.stringify(entry), {
      metadata: {
        fetchedAt: entry.fetchedAt,
        lastAccessedAt: entry.lastAccessedAt,
        partial: entry.partial,
      },
    });
  });
});

describe('touchLastAccessed', () => {
  it('updates only lastAccessedAt', async () => {
    const kv = createMockKV();
    const entry = createEntry({
      fetchedAt: '2025-01-14T08:00:00Z',
      lastAccessedAt: '2025-01-15T10:00:00Z',
    });

    await touchLastAccessed(kv, 'npm:react', entry, NOW);

    const written = JSON.parse(
      (kv.put as ReturnType<typeof vi.fn>).mock.calls[0]![1]
    );
    expect(written.lastAccessedAt).toBe(NOW.toISOString());
    expect(written.fetchedAt).toBe('2025-01-14T08:00:00Z');
    expect(written.repos).toEqual(entry.repos);
    expect(written.partial).toBe(entry.partial);
  });

  it('passes metadata to kv.put', async () => {
    const kv = createMockKV();
    const entry = createEntry({
      fetchedAt: '2025-01-14T08:00:00Z',
      lastAccessedAt: '2025-01-15T10:00:00Z',
    });

    await touchLastAccessed(kv, 'npm:react', entry, NOW);

    expect(kv.put).toHaveBeenCalledWith('npm:react', expect.any(String), {
      metadata: {
        fetchedAt: '2025-01-14T08:00:00Z',
        lastAccessedAt: NOW.toISOString(),
        partial: false,
      },
    });
  });
});

function createEntry(overrides: Partial<CacheEntry> = {}): CacheEntry {
  return {
    repos: [
      {
        owner: 'test',
        name: 'repo',
        fullName: 'test/repo',
        stars: 100,
        lastPush: '2025-01-01T00:00:00Z',
        avatarUrl: 'https://example.com/avatar.png',
        isFork: false,
        archived: false,
        score: 95,
      },
    ],
    fetchedAt: '2025-01-15T10:00:00Z',
    lastAccessedAt: '2025-01-15T10:00:00Z',
    partial: false,
    ...overrides,
  };
}

function createMockKV(data: Record<string, string> = {}) {
  return {
    get: vi.fn((key: string) => Promise.resolve(data[key] ?? null)),
    put: vi.fn(() => Promise.resolve()),
  } as unknown as KVNamespace;
}
