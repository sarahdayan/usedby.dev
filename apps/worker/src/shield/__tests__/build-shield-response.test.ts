import { describe, expect, it } from 'vitest';

import {
  buildShieldError,
  buildShieldSuccess,
  buildShieldUnavailable,
  formatBadgeCount,
} from '../build-shield-response';

describe('formatBadgeCount', () => {
  it('returns exact number under 1,000', () => {
    expect(formatBadgeCount(0)).toBe('0');
    expect(formatBadgeCount(42)).toBe('42');
    expect(formatBadgeCount(999)).toBe('999');
  });

  it('abbreviates thousands with one decimal under 10K', () => {
    expect(formatBadgeCount(1_000)).toBe('1K+');
    expect(formatBadgeCount(1_500)).toBe('1.5K+');
    expect(formatBadgeCount(4_027)).toBe('4K+');
    expect(formatBadgeCount(9_999)).toBe('9.9K+');
  });

  it('abbreviates thousands without decimal at 10K+', () => {
    expect(formatBadgeCount(10_000)).toBe('10K+');
    expect(formatBadgeCount(42_500)).toBe('42K+');
    expect(formatBadgeCount(999_999)).toBe('999K+');
  });

  it('abbreviates millions with one decimal under 10M', () => {
    expect(formatBadgeCount(1_000_000)).toBe('1M+');
    expect(formatBadgeCount(1_500_000)).toBe('1.5M+');
    expect(formatBadgeCount(4_027_885)).toBe('4M+');
    expect(formatBadgeCount(9_999_999)).toBe('9.9M+');
  });

  it('abbreviates millions without decimal at 10M+', () => {
    expect(formatBadgeCount(10_000_000)).toBe('10M+');
    expect(formatBadgeCount(42_000_000)).toBe('42M+');
  });
});

describe('buildShieldSuccess', () => {
  it('returns brightgreen for positive counts', () => {
    const result = buildShieldSuccess(42);

    expect(result).toEqual({
      schemaVersion: 1,
      label: 'used by',
      message: '42 projects',
      color: 'brightgreen',
    });
  });

  it('abbreviates large numbers', () => {
    expect(buildShieldSuccess(1_234_567).message).toBe('1.2M+ projects');
  });

  it('uses singular "project" for count of 1', () => {
    expect(buildShieldSuccess(1).message).toBe('1 project');
  });

  it('uses plural "projects" for count of 0', () => {
    const result = buildShieldSuccess(0);

    expect(result.message).toBe('0 projects');
    expect(result.color).toBe('lightgrey');
  });

  it('returns lightgrey for zero count', () => {
    expect(buildShieldSuccess(0).color).toBe('lightgrey');
  });
});

describe('buildShieldUnavailable', () => {
  it('returns unavailable message with lightgrey', () => {
    expect(buildShieldUnavailable()).toEqual({
      schemaVersion: 1,
      label: 'used by',
      message: 'unavailable',
      color: 'lightgrey',
    });
  });
});

describe('buildShieldError', () => {
  it('returns error message with red and isError flag', () => {
    expect(buildShieldError()).toEqual({
      schemaVersion: 1,
      label: 'used by',
      message: 'error',
      color: 'red',
      isError: true,
    });
  });
});
