import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearRegistry, getStrategy, registerStrategy } from '../registry';
import { phpStrategy } from '../php';

describe('phpStrategy', () => {
  describe('registration', () => {
    beforeEach(() => {
      clearRegistry();
    });

    it('can be registered and retrieved', () => {
      registerStrategy(phpStrategy);

      expect(getStrategy('composer')).toBe(phpStrategy);
    });
  });

  describe('buildSearchQuery', () => {
    it('returns correct query for a package', () => {
      expect(phpStrategy.buildSearchQuery('laravel/framework')).toBe(
        '"laravel/framework" filename:composer.json'
      );
    });
  });

  describe('isDependency', () => {
    it('returns true when package is in require', () => {
      const manifest = JSON.stringify({
        require: { 'laravel/framework': '^10.0' },
      });

      expect(phpStrategy.isDependency(manifest, 'laravel/framework')).toBe(
        true
      );
    });

    it('returns true when package is in require-dev', () => {
      const manifest = JSON.stringify({
        'require-dev': { 'phpunit/phpunit': '^10.0' },
      });

      expect(phpStrategy.isDependency(manifest, 'phpunit/phpunit')).toBe(true);
    });

    it('returns false when package is not present', () => {
      const manifest = JSON.stringify({
        require: { 'laravel/framework': '^10.0' },
      });

      expect(phpStrategy.isDependency(manifest, 'symfony/console')).toBe(false);
    });

    it('returns false for partial name match', () => {
      const manifest = JSON.stringify({
        require: { 'laravel/framework-extra': '^1.0' },
      });

      expect(phpStrategy.isDependency(manifest, 'laravel/framework')).toBe(
        false
      );
    });

    it('returns false for malformed JSON', () => {
      expect(phpStrategy.isDependency('not json{', 'laravel/framework')).toBe(
        false
      );
    });
  });

  describe('resolveGitHubRepo', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('resolves from source.url in first package version', async () => {
      mockFetch({
        packages: {
          'laravel/framework': [
            {
              version: '10.0.0',
              source: {
                url: 'https://github.com/laravel/framework.git',
                type: 'git',
              },
            },
          ],
        },
      });

      expect(await phpStrategy.resolveGitHubRepo('laravel/framework')).toEqual({
        owner: 'laravel',
        repo: 'framework',
      });
    });

    it('strips .git suffix', async () => {
      mockFetch({
        packages: {
          'symfony/console': [
            {
              version: '6.0.0',
              source: {
                url: 'https://github.com/symfony/console.git',
                type: 'git',
              },
            },
          ],
        },
      });

      expect(await phpStrategy.resolveGitHubRepo('symfony/console')).toEqual({
        owner: 'symfony',
        repo: 'console',
      });
    });

    it('returns null for non-200 response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('Not Found', { status: 404 })
      );

      expect(
        await phpStrategy.resolveGitHubRepo('nonexistent/package')
      ).toBeNull();
    });

    it('returns null when packages key is empty', async () => {
      mockFetch({
        packages: {},
      });

      expect(await phpStrategy.resolveGitHubRepo('vendor/package')).toBeNull();
    });

    it('returns null for non-GitHub URL', async () => {
      mockFetch({
        packages: {
          'vendor/package': [
            {
              version: '1.0.0',
              source: {
                url: 'https://gitlab.com/vendor/package.git',
                type: 'git',
              },
            },
          ],
        },
      });

      expect(await phpStrategy.resolveGitHubRepo('vendor/package')).toBeNull();
    });

    it('returns null on fetch error', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(
        new Error('Network error')
      );

      expect(
        await phpStrategy.resolveGitHubRepo('laravel/framework')
      ).toBeNull();
    });
  });

  describe('packageNamePattern', () => {
    it('matches a valid vendor/package name', () => {
      expect(phpStrategy.packageNamePattern.test('laravel/framework')).toBe(
        true
      );
    });

    it('matches with hyphens', () => {
      expect(phpStrategy.packageNamePattern.test('symfony/http-kernel')).toBe(
        true
      );
    });

    it('matches with dots and underscores', () => {
      expect(phpStrategy.packageNamePattern.test('vendor/my_pkg.ext')).toBe(
        true
      );
    });

    it('rejects empty string', () => {
      expect(phpStrategy.packageNamePattern.test('')).toBe(false);
    });

    it('rejects name without vendor prefix', () => {
      expect(phpStrategy.packageNamePattern.test('framework')).toBe(false);
    });

    it('rejects name with spaces', () => {
      expect(phpStrategy.packageNamePattern.test('vendor/my package')).toBe(
        false
      );
    });

    it('rejects uppercase letters', () => {
      expect(phpStrategy.packageNamePattern.test('Laravel/Framework')).toBe(
        false
      );
    });
  });
});

function mockFetch(body: Record<string, unknown>): void {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), { status: 200 })
  );
}
