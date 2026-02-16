import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearRegistry, getStrategy, registerStrategy } from '../registry';
import { rubyStrategy } from '../ruby';

describe('rubyStrategy', () => {
  describe('registration', () => {
    beforeEach(() => {
      clearRegistry();
    });

    it('can be registered and retrieved', () => {
      registerStrategy(rubyStrategy);

      expect(getStrategy('rubygems')).toBe(rubyStrategy);
    });
  });

  describe('buildSearchQuery', () => {
    it('returns correct query for a gem name', () => {
      expect(rubyStrategy.buildSearchQuery('rails')).toBe(
        '"rails" filename:Gemfile'
      );
    });
  });

  describe('isDependency', () => {
    it('returns found for single-quoted gem name', () => {
      expect(rubyStrategy.isDependency("gem 'rails'", 'rails')).toEqual({
        found: true,
        depType: 'dependencies',
      });
    });

    it('returns found for double-quoted gem name', () => {
      expect(rubyStrategy.isDependency('gem "rails"', 'rails')).toEqual({
        found: true,
        depType: 'dependencies',
      });
    });

    it('returns found with version constraint', () => {
      expect(
        rubyStrategy.isDependency("gem 'rails', '~> 7.0'", 'rails')
      ).toEqual({ found: true, version: '~> 7.0', depType: 'dependencies' });
    });

    it('returns found with leading whitespace', () => {
      expect(rubyStrategy.isDependency("  gem 'rails'", 'rails')).toEqual({
        found: true,
        depType: 'dependencies',
      });
    });

    it('returns not found when gem is not present', () => {
      expect(rubyStrategy.isDependency("gem 'nokogiri'", 'rails')).toEqual({
        found: false,
      });
    });

    it('returns not found for partial name match', () => {
      expect(
        rubyStrategy.isDependency("gem 'rails-html-sanitizer'", 'rails')
      ).toEqual({ found: false });
    });

    it('returns not found for empty content', () => {
      expect(rubyStrategy.isDependency('', 'rails')).toEqual({
        found: false,
      });
    });
  });

  describe('resolveGitHubRepo', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('resolves from source_code_uri', async () => {
      mockFetch({
        source_code_uri: 'https://github.com/rails/rails',
      });

      expect(await rubyStrategy.resolveGitHubRepo('rails')).toEqual({
        owner: 'rails',
        repo: 'rails',
      });
    });

    it('resolves from homepage_uri when source_code_uri is missing', async () => {
      mockFetch({
        homepage_uri: 'https://github.com/rails/rails',
      });

      expect(await rubyStrategy.resolveGitHubRepo('rails')).toEqual({
        owner: 'rails',
        repo: 'rails',
      });
    });

    it('strips .git suffix', async () => {
      mockFetch({
        source_code_uri: 'https://github.com/rails/rails.git',
      });

      expect(await rubyStrategy.resolveGitHubRepo('rails')).toEqual({
        owner: 'rails',
        repo: 'rails',
      });
    });

    it('returns null for non-200 response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('Not Found', { status: 404 })
      );

      expect(await rubyStrategy.resolveGitHubRepo('nonexistent')).toBeNull();
    });

    it('returns null when no GitHub URL found', async () => {
      mockFetch({
        source_code_uri: 'https://gitlab.com/user/repo',
      });

      expect(await rubyStrategy.resolveGitHubRepo('some-gem')).toBeNull();
    });

    it('returns null on fetch error', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(
        new Error('Network error')
      );

      expect(await rubyStrategy.resolveGitHubRepo('rails')).toBeNull();
    });
  });

  describe('packageNamePattern', () => {
    it('matches a valid gem name', () => {
      expect(rubyStrategy.packageNamePattern.test('rails')).toBe(true);
    });

    it('matches a name with hyphens', () => {
      expect(rubyStrategy.packageNamePattern.test('ruby-lsp')).toBe(true);
    });

    it('matches a name with underscores', () => {
      expect(rubyStrategy.packageNamePattern.test('rails_admin')).toBe(true);
    });

    it('rejects empty string', () => {
      expect(rubyStrategy.packageNamePattern.test('')).toBe(false);
    });

    it('rejects name with spaces', () => {
      expect(rubyStrategy.packageNamePattern.test('my gem')).toBe(false);
    });

    it('rejects name starting with hyphen', () => {
      expect(rubyStrategy.packageNamePattern.test('-rails')).toBe(false);
    });
  });
});

function mockFetch(body: Record<string, unknown>): void {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), { status: 200 })
  );
}
