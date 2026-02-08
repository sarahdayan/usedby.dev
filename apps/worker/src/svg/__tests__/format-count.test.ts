import { describe, expect, it } from 'vitest';

import { formatCount } from '../format-count';

describe('formatCount', () => {
  it('formats small numbers without commas', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(1)).toBe('1');
    expect(formatCount(42)).toBe('42');
    expect(formatCount(999)).toBe('999');
  });

  it('formats thousands with commas', () => {
    expect(formatCount(1000)).toBe('1,000');
    expect(formatCount(1234)).toBe('1,234');
    expect(formatCount(9999)).toBe('9,999');
  });

  it('formats millions with commas', () => {
    expect(formatCount(1000000)).toBe('1,000,000');
    expect(formatCount(1234567)).toBe('1,234,567');
  });

  it('formats ten thousands', () => {
    expect(formatCount(12345)).toBe('12,345');
    expect(formatCount(100000)).toBe('100,000');
  });
});
