import { describe, expect, it } from 'vitest';

import { filterDependents, MIN_STARS } from '../filter-dependents';
import type { DependentRepo } from '../types';

describe('filterDependents', () => {
  it('excludes forks', () => {
    const repos = [createRepo({ name: 'fork', isFork: true })];

    const result = filterDependents(repos);

    expect(result).toEqual([]);
  });

  it('excludes archived repos', () => {
    const repos = [createRepo({ name: 'archived', archived: true })];

    const result = filterDependents(repos);

    expect(result).toEqual([]);
  });

  it('excludes repos below star threshold', () => {
    const repos = [createRepo({ name: 'low-stars', stars: MIN_STARS - 1 })];

    const result = filterDependents(repos);

    expect(result).toEqual([]);
  });

  it('includes repos at exactly the star threshold', () => {
    const repos = [createRepo({ name: 'threshold', stars: MIN_STARS })];

    const result = filterDependents(repos);

    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('threshold');
  });

  it('applies all filters together', () => {
    const repos = [
      createRepo({ name: 'good', stars: 100 }),
      createRepo({ name: 'fork', isFork: true }),
      createRepo({ name: 'archived', archived: true }),
      createRepo({ name: 'low-stars', stars: 1 }),
      createRepo({ name: 'also-good', stars: MIN_STARS }),
    ];

    const result = filterDependents(repos);

    expect(result.map((r) => r.name)).toEqual(['good', 'also-good']);
  });

  it('handles empty input', () => {
    const result = filterDependents([]);

    expect(result).toEqual([]);
  });

  it('returns empty array when all repos are filtered out', () => {
    const repos = [
      createRepo({ name: 'fork', isFork: true }),
      createRepo({ name: 'archived', archived: true }),
      createRepo({ name: 'low-stars', stars: 0 }),
    ];

    const result = filterDependents(repos);

    expect(result).toEqual([]);
  });

  it('preserves order of remaining repos', () => {
    const repos = [
      createRepo({ name: 'third', stars: 10 }),
      createRepo({ name: 'first', stars: 1000 }),
      createRepo({ name: 'second', stars: 50 }),
    ];

    const result = filterDependents(repos);

    expect(result.map((r) => r.name)).toEqual(['third', 'first', 'second']);
  });
});

function createRepo(
  overrides: Partial<DependentRepo> & { name: string }
): DependentRepo {
  return {
    owner: 'test',
    fullName: `test/${overrides.name}`,
    stars: 100,
    lastPush: '2025-01-01T00:00:00Z',
    avatarUrl: 'https://example.com/avatar.png',
    isFork: false,
    archived: false,
    ...overrides,
  };
}
