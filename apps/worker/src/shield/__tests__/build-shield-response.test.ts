import { describe, expect, it } from 'vitest';

import {
  buildShieldError,
  buildShieldSuccess,
  buildShieldUnavailable,
} from '../build-shield-response';

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

  it('formats large numbers with commas', () => {
    expect(buildShieldSuccess(1234567).message).toBe('1,234,567 projects');
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
