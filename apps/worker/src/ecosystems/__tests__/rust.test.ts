import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearRegistry, getStrategy, registerStrategy } from '../registry';
import { rustStrategy } from '../rust';

describe('rustStrategy', () => {
  describe('registration', () => {
    beforeEach(() => {
      clearRegistry();
    });

    it('can be registered and retrieved', () => {
      registerStrategy(rustStrategy);

      expect(getStrategy('cargo')).toBe(rustStrategy);
    });
  });

  describe('buildSearchQuery', () => {
    it('returns correct query for a crate name', () => {
      expect(rustStrategy.buildSearchQuery('serde')).toBe(
        '"serde" filename:Cargo.toml'
      );
    });
  });

  describe('isDependency', () => {
    it('returns found with version for simple version string', () => {
      const manifest = `[dependencies]\nserde = "1.0"`;

      expect(rustStrategy.isDependency(manifest, 'serde')).toEqual({
        found: true,
        version: '1.0',
        depType: 'dependencies',
      });
    });

    it('returns found with version for inline table', () => {
      const manifest = `[dependencies]\nserde = { version = "1.0", features = ["derive"] }`;

      expect(rustStrategy.isDependency(manifest, 'serde')).toEqual({
        found: true,
        version: '1.0',
        depType: 'dependencies',
      });
    });

    it('returns found with version for dotted key', () => {
      const manifest = `[dependencies]\nserde.version = "1.0"`;

      expect(rustStrategy.isDependency(manifest, 'serde')).toEqual({
        found: true,
        version: '1.0',
        depType: 'dependencies',
      });
    });

    it('returns found under [dev-dependencies]', () => {
      const manifest = `[dev-dependencies]\nserde = "1.0"`;

      expect(rustStrategy.isDependency(manifest, 'serde')).toEqual({
        found: true,
        version: '1.0',
        depType: 'devDependencies',
      });
    });

    it('returns found under [build-dependencies]', () => {
      const manifest = `[build-dependencies]\nserde = "1.0"`;

      expect(rustStrategy.isDependency(manifest, 'serde')).toEqual({
        found: true,
        version: '1.0',
        depType: 'dependencies',
      });
    });

    it('returns found with leading whitespace', () => {
      const manifest = `[dependencies]\n  serde = "1.0"`;

      expect(rustStrategy.isDependency(manifest, 'serde')).toEqual({
        found: true,
        version: '1.0',
        depType: 'dependencies',
      });
    });

    it('returns not found when crate not present', () => {
      const manifest = `[dependencies]\ntokio = "1.0"`;

      expect(rustStrategy.isDependency(manifest, 'serde')).toEqual({
        found: false,
      });
    });

    it('returns not found for partial name match', () => {
      const manifest = `[dependencies]\nserde_json = "1.0"`;

      expect(rustStrategy.isDependency(manifest, 'serde')).toEqual({
        found: false,
      });
    });

    it('returns not found for empty content', () => {
      expect(rustStrategy.isDependency('', 'serde')).toEqual({
        found: false,
      });
    });
  });

  describe('resolveGitHubRepo', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('resolves from crate.repository', async () => {
      mockFetch({
        crate: { repository: 'https://github.com/serde-rs/serde' },
      });

      expect(await rustStrategy.resolveGitHubRepo('serde')).toEqual({
        owner: 'serde-rs',
        repo: 'serde',
      });
    });

    it('strips .git suffix', async () => {
      mockFetch({
        crate: { repository: 'https://github.com/serde-rs/serde.git' },
      });

      expect(await rustStrategy.resolveGitHubRepo('serde')).toEqual({
        owner: 'serde-rs',
        repo: 'serde',
      });
    });

    it('returns null for non-200 response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('Not Found', { status: 404 })
      );

      expect(await rustStrategy.resolveGitHubRepo('nonexistent')).toBeNull();
    });

    it('returns null when repository is missing', async () => {
      mockFetch({ crate: {} });

      expect(await rustStrategy.resolveGitHubRepo('serde')).toBeNull();
    });

    it('returns null for non-GitHub URL', async () => {
      mockFetch({
        crate: { repository: 'https://gitlab.com/user/repo' },
      });

      expect(await rustStrategy.resolveGitHubRepo('some-crate')).toBeNull();
    });

    it('returns null on fetch error', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(
        new Error('Network error')
      );

      expect(await rustStrategy.resolveGitHubRepo('serde')).toBeNull();
    });

    it('sends User-Agent header', async () => {
      const mock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            crate: { repository: 'https://github.com/serde-rs/serde' },
          }),
          { status: 200 }
        )
      );

      await rustStrategy.resolveGitHubRepo('serde');

      const options = mock.mock.calls[0]![1] as RequestInit;

      expect(options.headers).toEqual({ 'User-Agent': 'usedby.dev' });
    });
  });

  describe('packageNamePattern', () => {
    it('matches a valid crate name', () => {
      expect(rustStrategy.packageNamePattern.test('serde')).toBe(true);
    });

    it('matches name with hyphens', () => {
      expect(rustStrategy.packageNamePattern.test('serde-json')).toBe(true);
    });

    it('matches name with underscores', () => {
      expect(rustStrategy.packageNamePattern.test('serde_json')).toBe(true);
    });

    it('rejects empty string', () => {
      expect(rustStrategy.packageNamePattern.test('')).toBe(false);
    });

    it('rejects name starting with digit', () => {
      expect(rustStrategy.packageNamePattern.test('1serde')).toBe(false);
    });

    it('rejects name with spaces', () => {
      expect(rustStrategy.packageNamePattern.test('my crate')).toBe(false);
    });
  });
});

function mockFetch(body: Record<string, unknown>): void {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), { status: 200 })
  );
}
