import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearRegistry, getStrategy, registerStrategy } from '../registry';
import { pythonStrategy } from '../python';

describe('pythonStrategy', () => {
  describe('registration', () => {
    beforeEach(() => {
      clearRegistry();
    });

    it('can be registered and retrieved', () => {
      registerStrategy(pythonStrategy);

      expect(getStrategy('pypi')).toBe(pythonStrategy);
    });
  });

  describe('buildSearchQuery', () => {
    it('returns correct query', () => {
      expect(pythonStrategy.buildSearchQuery('requests')).toBe(
        '"requests" filename:requirements.txt'
      );
    });
  });

  describe('isDependency', () => {
    it('returns true for exact package name', () => {
      expect(pythonStrategy.isDependency('requests\n', 'requests')).toBe(true);
    });

    it('returns true with version specifier', () => {
      expect(
        pythonStrategy.isDependency('requests==2.28.0\n', 'requests')
      ).toBe(true);
    });

    it('returns true with range specifier', () => {
      expect(
        pythonStrategy.isDependency('requests>=2.0,<3.0\n', 'requests')
      ).toBe(true);
    });

    it('returns true with extras', () => {
      expect(
        pythonStrategy.isDependency('requests[security]\n', 'requests')
      ).toBe(true);
    });

    it('returns true case-insensitively', () => {
      expect(pythonStrategy.isDependency('Requests\n', 'requests')).toBe(true);
    });

    it('returns true with hyphen/underscore normalization', () => {
      expect(pythonStrategy.isDependency('my-package\n', 'my_package')).toBe(
        true
      );
    });

    it('returns false when package not present', () => {
      expect(pythonStrategy.isDependency('flask\n', 'requests')).toBe(false);
    });

    it('returns false for partial name match', () => {
      expect(
        pythonStrategy.isDependency('requests-oauthlib\n', 'requests')
      ).toBe(false);
    });

    it('skips comment lines', () => {
      expect(
        pythonStrategy.isDependency('# requests\nflask\n', 'requests')
      ).toBe(false);
    });

    it('skips pip flag lines', () => {
      expect(pythonStrategy.isDependency('-r base.txt\nflask\n', 'base')).toBe(
        false
      );
    });

    it('handles empty content', () => {
      expect(pythonStrategy.isDependency('', 'requests')).toBe(false);
    });
  });

  describe('resolveGitHubRepo', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('resolves from project_urls.Repository', async () => {
      mockFetch({
        info: {
          project_urls: {
            Repository: 'https://github.com/psf/requests',
          },
        },
      });

      expect(await pythonStrategy.resolveGitHubRepo('requests')).toEqual({
        owner: 'psf',
        repo: 'requests',
      });
    });

    it('resolves from project_urls.Source when Repository missing', async () => {
      mockFetch({
        info: {
          project_urls: {
            Source: 'https://github.com/pallets/flask',
          },
        },
      });

      expect(await pythonStrategy.resolveGitHubRepo('flask')).toEqual({
        owner: 'pallets',
        repo: 'flask',
      });
    });

    it('resolves from project_urls.Homepage as fallback', async () => {
      mockFetch({
        info: {
          project_urls: {
            Homepage: 'https://github.com/django/django',
          },
        },
      });

      expect(await pythonStrategy.resolveGitHubRepo('django')).toEqual({
        owner: 'django',
        repo: 'django',
      });
    });

    it('returns null for non-200 response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('Not Found', { status: 404 })
      );

      expect(await pythonStrategy.resolveGitHubRepo('nonexistent')).toBeNull();
    });

    it('returns null when no GitHub URL found', async () => {
      mockFetch({
        info: {
          project_urls: {
            Homepage: 'https://docs.python.org',
          },
        },
      });

      expect(await pythonStrategy.resolveGitHubRepo('some-pkg')).toBeNull();
    });

    it('returns null on fetch error', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(
        new Error('Network error')
      );

      expect(await pythonStrategy.resolveGitHubRepo('requests')).toBeNull();
    });
  });

  describe('packageNamePattern', () => {
    it('matches a valid name', () => {
      expect(pythonStrategy.packageNamePattern.test('requests')).toBe(true);
    });

    it('matches name with hyphens, underscores, dots', () => {
      expect(pythonStrategy.packageNamePattern.test('my-pkg_v2.0')).toBe(true);
    });

    it('rejects empty string', () => {
      expect(pythonStrategy.packageNamePattern.test('')).toBe(false);
    });

    it('rejects name with spaces', () => {
      expect(pythonStrategy.packageNamePattern.test('my package')).toBe(false);
    });

    it('rejects name starting with hyphen', () => {
      expect(pythonStrategy.packageNamePattern.test('-requests')).toBe(false);
    });
  });
});

function mockFetch(body: Record<string, unknown>): void {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), { status: 200 })
  );
}
