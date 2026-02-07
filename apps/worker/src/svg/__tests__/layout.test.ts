import { describe, it, expect } from 'vitest';
import { computeLayout, computePositions } from '../layout';

describe('computeLayout', () => {
  it('computes a standard 5×7 grid for 35 avatars', () => {
    const layout = computeLayout(35);

    expect(layout.columns).toBe(7);
    expect(layout.rows).toBe(5);
    expect(layout.avatarSize).toBe(64);
    expect(layout.gap).toBe(12);
    expect(layout.padding).toBe(0);
    // width = 0 + 7*64 + 6*12 = 448 + 72 = 520
    expect(layout.width).toBe(520);
    // height = 0 + 5*64 + 4*12 = 320 + 48 = 368
    expect(layout.height).toBe(368);
  });

  it('narrows columns when fewer than COLUMNS avatars', () => {
    const layout = computeLayout(3);

    expect(layout.columns).toBe(3);
    expect(layout.rows).toBe(1);
    expect(layout.width).toBe(3 * 64 + 2 * 12);
    expect(layout.height).toBe(64);
  });

  it('handles a single avatar', () => {
    const layout = computeLayout(1);

    expect(layout.columns).toBe(1);
    expect(layout.rows).toBe(1);
    expect(layout.width).toBe(64);
    expect(layout.height).toBe(64);
  });

  it('returns zero dimensions for zero avatars', () => {
    const layout = computeLayout(0);

    expect(layout.columns).toBe(0);
    expect(layout.rows).toBe(0);
    expect(layout.width).toBe(0);
    expect(layout.height).toBe(0);
  });

  it('handles a partial last row', () => {
    const layout = computeLayout(10);

    expect(layout.columns).toBe(7);
    expect(layout.rows).toBe(2);
    expect(layout.width).toBe(520);
    expect(layout.height).toBe(2 * 64 + 1 * 12);
  });
});

describe('computePositions', () => {
  it('returns correct center positions for a single-row grid', () => {
    const layout = computeLayout(6);
    const positions = computePositions(6, layout);

    expect(positions).toHaveLength(6);

    // First avatar: top-left
    expect(positions[0]).toEqual({ cx: 32, cy: 32, index: 0 });
    // Second avatar: one step right
    expect(positions[1]).toEqual({ cx: 32 + 76, cy: 32, index: 1 });
    // Fourth avatar: fourth column
    expect(positions[3]).toEqual({ cx: 32 + 3 * 76, cy: 32, index: 3 });
  });

  it('positions avatars in the correct row', () => {
    const layout = computeLayout(10);
    const positions = computePositions(10, layout);

    // First row: indices 0-6
    for (let i = 0; i < 7; i++) {
      expect(positions[i]!.cy).toBe(32);
    }
    // Second row: indices 7-9
    for (let i = 7; i < 10; i++) {
      expect(positions[i]!.cy).toBe(32 + 76);
    }
  });

  it('returns empty array for zero avatars', () => {
    const layout = computeLayout(1); // layout needs valid input
    const positions = computePositions(0, layout);

    expect(positions).toEqual([]);
  });
});
