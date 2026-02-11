import { describe, expect, it } from 'vitest';

import { goStrategy } from '../go';
import { clearRegistry, getStrategy, registerStrategy } from '../registry';

describe('goStrategy', () => {
  describe('registration', () => {
    it('can be registered and retrieved', () => {
      clearRegistry();
      registerStrategy(goStrategy);

      expect(getStrategy('go')).toBe(goStrategy);
    });
  });

  describe('buildSearchQuery', () => {
    it('returns correct query for an owner/repo name', () => {
      expect(goStrategy.buildSearchQuery('gin-gonic/gin')).toBe(
        '"github.com/gin-gonic/gin" filename:go.mod'
      );
    });
  });

  describe('isDependency', () => {
    it('returns true for a require line', () => {
      const manifest = `module example.com/myapp\n\nrequire (\n\tgithub.com/gin-gonic/gin v1.9.1\n)`;

      expect(goStrategy.isDependency(manifest, 'gin-gonic/gin')).toBe(true);
    });

    it('returns true for a single-line require', () => {
      const manifest = `module example.com/myapp\n\nrequire github.com/gin-gonic/gin v1.9.1`;

      expect(goStrategy.isDependency(manifest, 'gin-gonic/gin')).toBe(true);
    });

    it('returns true with leading whitespace (tab)', () => {
      const manifest = `require (\n\tgithub.com/gin-gonic/gin v1.9.1\n)`;

      expect(goStrategy.isDependency(manifest, 'gin-gonic/gin')).toBe(true);
    });

    it('returns true with leading whitespace (spaces)', () => {
      const manifest = `require (\n    github.com/gin-gonic/gin v1.9.1\n)`;

      expect(goStrategy.isDependency(manifest, 'gin-gonic/gin')).toBe(true);
    });

    it('returns false when module not present', () => {
      const manifest = `require (\n\tgithub.com/stretchr/testify v1.8.0\n)`;

      expect(goStrategy.isDependency(manifest, 'gin-gonic/gin')).toBe(false);
    });

    it('returns false for partial name match', () => {
      const manifest = `require (\n\tgithub.com/gin-gonic/gin-contrib v0.1.0\n)`;

      expect(goStrategy.isDependency(manifest, 'gin-gonic/gin')).toBe(false);
    });

    it('returns false for the module declaration', () => {
      const manifest = `module github.com/gin-gonic/gin\n\nrequire (\n\tgolang.org/x/net v0.0.0\n)`;

      expect(goStrategy.isDependency(manifest, 'gin-gonic/gin')).toBe(false);
    });

    it('returns false for empty content', () => {
      expect(goStrategy.isDependency('', 'gin-gonic/gin')).toBe(false);
    });

    it('escapes special regex characters in package name', () => {
      const manifest = `require (\n\tgithub.com/foo.bar/baz v1.0.0\n)`;

      expect(goStrategy.isDependency(manifest, 'foo.bar/baz')).toBe(true);
      expect(goStrategy.isDependency(manifest, 'fooXbar/baz')).toBe(false);
    });
  });

  describe('resolveGitHubRepo', () => {
    it('parses owner/repo directly', async () => {
      expect(await goStrategy.resolveGitHubRepo('gin-gonic/gin')).toEqual({
        owner: 'gin-gonic',
        repo: 'gin',
      });
    });

    it('returns null for a single segment', async () => {
      expect(await goStrategy.resolveGitHubRepo('gin')).toBeNull();
    });

    it('returns null for more than two segments', async () => {
      expect(
        await goStrategy.resolveGitHubRepo('github.com/gin-gonic/gin')
      ).toBeNull();
    });

    it('returns null for empty string', async () => {
      expect(await goStrategy.resolveGitHubRepo('')).toBeNull();
    });
  });

  describe('packageNamePattern', () => {
    it('matches valid owner/repo', () => {
      expect(goStrategy.packageNamePattern.test('gin-gonic/gin')).toBe(true);
    });

    it('matches name with dots', () => {
      expect(goStrategy.packageNamePattern.test('foo/bar.v2')).toBe(true);
    });

    it('matches name with underscores', () => {
      expect(goStrategy.packageNamePattern.test('foo_bar/baz')).toBe(true);
    });

    it('rejects empty string', () => {
      expect(goStrategy.packageNamePattern.test('')).toBe(false);
    });

    it('rejects single segment', () => {
      expect(goStrategy.packageNamePattern.test('gin')).toBe(false);
    });

    it('rejects name with spaces', () => {
      expect(goStrategy.packageNamePattern.test('gin gonic/gin')).toBe(false);
    });
  });
});
