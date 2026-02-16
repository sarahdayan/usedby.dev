import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearRegistry, getStrategy, registerStrategy } from '../registry';
import { npmStrategy } from '../npm';

describe('npmStrategy', () => {
  describe('registration', () => {
    beforeEach(() => {
      clearRegistry();
    });

    it('can be registered and retrieved', () => {
      registerStrategy(npmStrategy);

      expect(getStrategy('npm')).toBe(npmStrategy);
    });
  });

  describe('buildSearchQuery', () => {
    it('returns correct query for a plain package', () => {
      expect(npmStrategy.buildSearchQuery('react')).toBe(
        '"react" filename:package.json'
      );
    });

    it('returns correct query for a scoped package', () => {
      expect(npmStrategy.buildSearchQuery('@algolia/client-search')).toBe(
        '"@algolia/client-search" filename:package.json'
      );
    });
  });

  describe('isDependency', () => {
    it('returns found with version when package is in dependencies', () => {
      const manifest = JSON.stringify({ dependencies: { react: '^18.0.0' } });

      expect(npmStrategy.isDependency(manifest, 'react')).toEqual({
        found: true,
        version: '^18.0.0',
        depType: 'dependencies',
      });
    });

    it('returns found with version when package is in devDependencies', () => {
      const manifest = JSON.stringify({
        devDependencies: { vitest: '^1.0.0' },
      });

      expect(npmStrategy.isDependency(manifest, 'vitest')).toEqual({
        found: true,
        version: '^1.0.0',
        depType: 'devDependencies',
      });
    });

    it('returns found with version when package is in peerDependencies', () => {
      const manifest = JSON.stringify({
        peerDependencies: { react: '>=17' },
      });

      expect(npmStrategy.isDependency(manifest, 'react')).toEqual({
        found: true,
        version: '>=17',
        depType: 'peerDependencies',
      });
    });

    it('returns found with version when package is in optionalDependencies', () => {
      const manifest = JSON.stringify({
        optionalDependencies: { fsevents: '^2.0.0' },
      });

      expect(npmStrategy.isDependency(manifest, 'fsevents')).toEqual({
        found: true,
        version: '^2.0.0',
        depType: 'optionalDependencies',
      });
    });

    it('returns not found when package is absent', () => {
      const manifest = JSON.stringify({ dependencies: { lodash: '^4.0.0' } });

      expect(npmStrategy.isDependency(manifest, 'react')).toEqual({
        found: false,
      });
    });

    it('returns not found for malformed JSON', () => {
      expect(npmStrategy.isDependency('not json{', 'react')).toEqual({
        found: false,
      });
    });
  });

  describe('resolveGitHubRepo', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('resolves an HTTPS GitHub URL', async () => {
      mockFetch({
        repository: { url: 'https://github.com/facebook/react' },
      });

      expect(await npmStrategy.resolveGitHubRepo('react')).toEqual({
        owner: 'facebook',
        repo: 'react',
      });
    });

    it('resolves a git+https GitHub URL', async () => {
      mockFetch({
        repository: {
          url: 'git+https://github.com/facebook/react.git',
        },
      });

      expect(await npmStrategy.resolveGitHubRepo('react')).toEqual({
        owner: 'facebook',
        repo: 'react',
      });
    });

    it('resolves a git:// GitHub URL', async () => {
      mockFetch({
        repository: { url: 'git://github.com/facebook/react.git' },
      });

      expect(await npmStrategy.resolveGitHubRepo('react')).toEqual({
        owner: 'facebook',
        repo: 'react',
      });
    });

    it('resolves an SSH GitHub URL', async () => {
      mockFetch({
        repository: { url: 'git@github.com:facebook/react.git' },
      });

      expect(await npmStrategy.resolveGitHubRepo('react')).toEqual({
        owner: 'facebook',
        repo: 'react',
      });
    });

    it('strips .git suffix', async () => {
      mockFetch({
        repository: {
          url: 'https://github.com/facebook/react.git',
        },
      });

      expect(await npmStrategy.resolveGitHubRepo('react')).toEqual({
        owner: 'facebook',
        repo: 'react',
      });
    });

    it('returns null for non-200 response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('Not Found', { status: 404 })
      );

      expect(await npmStrategy.resolveGitHubRepo('nonexistent')).toBeNull();
    });

    it('returns null when repository.url is missing', async () => {
      mockFetch({});

      expect(await npmStrategy.resolveGitHubRepo('react')).toBeNull();
    });

    it('returns null for non-GitHub URL', async () => {
      mockFetch({
        repository: { url: 'https://gitlab.com/user/repo' },
      });

      expect(await npmStrategy.resolveGitHubRepo('some-pkg')).toBeNull();
    });

    it('returns null on fetch error', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(
        new Error('Network error')
      );

      expect(await npmStrategy.resolveGitHubRepo('react')).toBeNull();
    });

    it('handles scoped package names', async () => {
      mockFetch({
        repository: {
          url: 'https://github.com/algolia/algoliasearch-client-javascript',
        },
      });

      expect(
        await npmStrategy.resolveGitHubRepo('@algolia/client-search')
      ).toEqual({
        owner: 'algolia',
        repo: 'algoliasearch-client-javascript',
      });
    });
  });

  describe('packageNamePattern', () => {
    it('matches a plain package name', () => {
      expect(npmStrategy.packageNamePattern.test('react')).toBe(true);
    });

    it('matches a scoped package name', () => {
      expect(
        npmStrategy.packageNamePattern.test('@algolia/client-search')
      ).toBe(true);
    });

    it('rejects an empty string', () => {
      expect(npmStrategy.packageNamePattern.test('')).toBe(false);
    });

    it('rejects a name with spaces', () => {
      expect(npmStrategy.packageNamePattern.test('my package')).toBe(false);
    });

    it('rejects a name starting with a slash', () => {
      expect(npmStrategy.packageNamePattern.test('/react')).toBe(false);
    });
  });
});

function mockFetch(body: Record<string, unknown>): void {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), { status: 200 })
  );
}
