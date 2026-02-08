import { describe, it, expect } from 'vitest';
import { computeLayout, computePositions } from '../layout';

describe('computeLayout', () => {
  it('computes a standard 4×10 grid for 35 avatars', () => {
    const layout = computeLayout(35);

    expect(layout.columns).toBe(10);
    expect(layout.rows).toBe(4);
    expect(layout.avatarSize).toBe(70);
    expect(layout.gap).toBe(12);
    expect(layout.padding).toBe(1);
    // width = 1*2 + 10*70 + 9*12 = 810
    expect(layout.width).toBe(810);
    // height = 1*2 + 4*70 + 3*12 = 318
    expect(layout.height).toBe(318);
  });

  it('narrows columns when fewer than COLUMNS avatars', () => {
    const layout = computeLayout(3);

    expect(layout.columns).toBe(3);
    expect(layout.rows).toBe(1);
    expect(layout.width).toBe(1 * 2 + 3 * 70 + 2 * 12);
    expect(layout.height).toBe(1 * 2 + 70);
  });

  it('handles a single avatar', () => {
    const layout = computeLayout(1);

    expect(layout.columns).toBe(1);
    expect(layout.rows).toBe(1);
    expect(layout.width).toBe(72);
    expect(layout.height).toBe(72);
  });

  it('returns zero dimensions for zero avatars', () => {
    const layout = computeLayout(0);

    expect(layout.columns).toBe(0);
    expect(layout.rows).toBe(0);
    expect(layout.width).toBe(0);
    expect(layout.height).toBe(0);
  });

  it('handles a partial last row', () => {
    const layout = computeLayout(15);

    expect(layout.columns).toBe(10);
    expect(layout.rows).toBe(2);
    expect(layout.width).toBe(810);
    expect(layout.height).toBe(1 * 2 + 2 * 70 + 1 * 12);
  });
});

describe('computePositions', () => {
  it('returns correct center positions for a single-row grid', () => {
    const layout = computeLayout(6);
    const positions = computePositions(6, layout);

    expect(positions).toHaveLength(6);

    // First avatar: top-left (padding=1, radius=35, step=70+12=82)
    expect(positions[0]).toEqual({ cx: 36, cy: 36, index: 0 });
    // Second avatar: one step right
    expect(positions[1]).toEqual({ cx: 36 + 82, cy: 36, index: 1 });
    // Fourth avatar: fourth column
    expect(positions[3]).toEqual({ cx: 36 + 3 * 82, cy: 36, index: 3 });
  });

  it('positions avatars in the correct row', () => {
    const layout = computeLayout(15);
    const positions = computePositions(15, layout);

    // First row: indices 0-9
    for (let i = 0; i < 10; i++) {
      expect(positions[i]!.cy).toBe(36);
    }
    // Second row: indices 10-14
    for (let i = 10; i < 15; i++) {
      expect(positions[i]!.cy).toBe(36 + 82);
    }
  });

  it('returns empty array for zero avatars', () => {
    const layout = computeLayout(1); // layout needs valid input
    const positions = computePositions(0, layout);

    expect(positions).toEqual([]);
  });
});
