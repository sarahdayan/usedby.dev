import { describe, expect, it } from 'vitest';

import { scoreDependents } from '../score-dependents';
import type { DependentRepo } from '../types';

const NOW = new Date('2025-01-01T00:00:00Z');

describe('scoreDependents', () => {
  it('sorts repos by score descending', () => {
    const repos = [
      createRepo({ name: 'low', stars: 10 }),
      createRepo({ name: 'high', stars: 1000 }),
      createRepo({ name: 'mid', stars: 100 }),
    ];

    const result = scoreDependents(repos, NOW);

    expect(result.map((r) => r.name)).toEqual(['high', 'mid', 'low']);
  });

  it('computes correct score (stars × recency multiplier)', () => {
    const repos = [
      createRepo({
        name: 'recent',
        stars: 100,
        lastPush: '2025-01-01T00:00:00Z',
      }),
    ];

    const result = scoreDependents(repos, NOW);

    // 0 days since push → multiplier = 0.5^0 = 1.0
    expect(result[0]!.score).toBe(100);
  });

  it('gives recent push higher multiplier than old push', () => {
    const repos = [
      createRepo({
        name: 'recent',
        stars: 100,
        lastPush: '2024-12-01T00:00:00Z',
      }),
      createRepo({ name: 'old', stars: 100, lastPush: '2020-01-01T00:00:00Z' }),
    ];

    const result = scoreDependents(repos, NOW);

    expect(result[0]!.name).toBe('recent');
    expect(result[0]!.score).toBeGreaterThan(result[1]!.score);
  });

  it('gives repos with empty lastPush a score of 0', () => {
    const repos = [createRepo({ name: 'no-push', stars: 1000, lastPush: '' })];

    const result = scoreDependents(repos, NOW);

    expect(result[0]!.score).toBe(0);
  });

  it('gives repos with unparseable lastPush a score of 0', () => {
    const repos = [
      createRepo({ name: 'garbage', stars: 1000, lastPush: 'not-a-date' }),
    ];

    const result = scoreDependents(repos, NOW);

    expect(result[0]!.score).toBe(0);
  });

  it('gives zero-star repos a score of 0 regardless of recency', () => {
    const repos = [
      createRepo({
        name: 'no-stars',
        stars: 0,
        lastPush: '2025-01-01T00:00:00Z',
      }),
    ];

    const result = scoreDependents(repos, NOW);

    expect(result[0]!.score).toBe(0);
  });

  it('handles empty input', () => {
    const result = scoreDependents([], NOW);

    expect(result).toEqual([]);
  });

  it('preserves input order for equal scores (stable sort)', () => {
    const repos = [
      createRepo({ name: 'first', stars: 50 }),
      createRepo({ name: 'second', stars: 50 }),
      createRepo({ name: 'third', stars: 50 }),
    ];

    const result = scoreDependents(repos, NOW);

    expect(result.map((r) => r.name)).toEqual(['first', 'second', 'third']);
  });

  it('caps multiplier at 1.0 for future push dates', () => {
    const repos = [
      createRepo({
        name: 'future',
        stars: 100,
        lastPush: '2025-06-01T00:00:00Z',
      }),
    ];

    const result = scoreDependents(repos, NOW);

    expect(result[0]!.score).toBe(100);
  });

  it('applies half-life decay correctly at 1 year', () => {
    const repos = [
      createRepo({
        name: 'one-year',
        stars: 100,
        lastPush: '2024-01-01T00:00:00Z',
      }),
    ];

    const result = scoreDependents(repos, NOW);

    // 366 days (2024 is a leap year), multiplier ≈ 0.5^(366/365) ≈ 0.4981
    expect(result[0]!.score).toBeCloseTo(49.81, 0);
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
