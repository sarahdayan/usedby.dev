import { describe, expect, it } from 'vitest';

import { parseCacheKey } from '../parse-cache-key';

describe('parseCacheKey', () => {
  it('parses a simple key', () => {
    expect(parseCacheKey('npm:react')).toEqual({
      platform: 'npm',
      packageName: 'react',
    });
  });

  it('parses a scoped package key', () => {
    expect(parseCacheKey('npm:@algolia/autocomplete-core')).toEqual({
      platform: 'npm',
      packageName: '@algolia/autocomplete-core',
    });
  });

  it('returns null for a key without a colon', () => {
    expect(parseCacheKey('npmreact')).toBeNull();
  });

  it('returns null for an empty platform', () => {
    expect(parseCacheKey(':react')).toBeNull();
  });

  it('returns null for an empty package name', () => {
    expect(parseCacheKey('npm:')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(parseCacheKey('')).toBeNull();
  });
});
