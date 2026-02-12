import { beforeEach, describe, expect, it } from 'vitest';

import type { EcosystemStrategy } from '../strategy';
import {
  clearRegistry,
  getStrategy,
  getSupportedPlatforms,
  registerStrategy,
} from '../registry';

describe('registry', () => {
  beforeEach(() => {
    clearRegistry();
  });

  it('returns a registered strategy', () => {
    const strategy = createMockStrategy('npm');
    registerStrategy(strategy);

    expect(getStrategy('npm')).toBe(strategy);
  });

  it('returns undefined for an unknown platform', () => {
    expect(getStrategy('unknown')).toBeUndefined();
  });

  it('throws on duplicate platform registration', () => {
    registerStrategy(createMockStrategy('npm'));

    expect(() => registerStrategy(createMockStrategy('npm'))).toThrowError(
      'Strategy already registered for platform "npm"'
    );
  });

  it('returns all registered platform slugs', () => {
    registerStrategy(createMockStrategy('npm'));
    registerStrategy(createMockStrategy('rubygems'));

    expect(getSupportedPlatforms()).toEqual(['npm', 'rubygems']);
  });

  it('returns an empty array when no strategies are registered', () => {
    expect(getSupportedPlatforms()).toEqual([]);
  });
});

function createMockStrategy(platform = 'mock'): EcosystemStrategy {
  return {
    platform,
    manifestFilename: 'mock.json',
    packageNamePattern: /^[a-z]+$/,
    buildSearchQuery: (packageName: string) =>
      `"${packageName}" filename:mock.json`,
    isDependency: () => ({ found: true }),
    resolveGitHubRepo: async () => null,
  };
}
