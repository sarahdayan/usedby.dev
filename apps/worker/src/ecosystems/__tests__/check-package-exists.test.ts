import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { checkPackageExists } from '../check-package-exists';
import type { EcosystemStrategy } from '../strategy';

function makeStrategy(platform: string): EcosystemStrategy {
  return {
    platform,
    manifestFilename: '',
    packageNamePattern: /.*/,
    buildSearchQuery: () => '',
    isDependency: () => ({ found: false }),
    resolveGitHubRepo: async () => null,
  };
}

describe('checkPackageExists', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns true when the registry responds with 200', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
    });

    const result = await checkPackageExists(makeStrategy('npm'), 'react');

    expect(result).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://registry.npmjs.org/react',
      { method: 'HEAD' }
    );
  });

  it('returns false when the registry responds with 404', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
    });

    const result = await checkPackageExists(
      makeStrategy('npm'),
      'nonexistent-pkg-xyz'
    );

    expect(result).toBe(false);
  });

  it('returns true on network error (permissive)', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('network error')
    );

    const result = await checkPackageExists(makeStrategy('npm'), 'react');

    expect(result).toBe(true);
  });

  it('returns true for unknown platforms (permissive)', async () => {
    const result = await checkPackageExists(
      makeStrategy('unknown'),
      'some-pkg'
    );

    expect(result).toBe(true);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('checks pypi registry for python packages', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
    });

    await checkPackageExists(makeStrategy('pypi'), 'requests');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://pypi.org/pypi/requests/json',
      { method: 'HEAD' }
    );
  });

  it('checks crates.io for cargo packages', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
    });

    await checkPackageExists(makeStrategy('cargo'), 'serde');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://crates.io/api/v1/crates/serde',
      { method: 'HEAD', headers: { 'User-Agent': 'usedby.dev' } }
    );
  });

  it('checks packagist for composer packages', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
    });

    await checkPackageExists(makeStrategy('composer'), 'laravel/framework');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://repo.packagist.org/p2/laravel/framework.json',
      { method: 'HEAD' }
    );
  });

  it('checks rubygems for ruby packages', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
    });

    await checkPackageExists(makeStrategy('rubygems'), 'rails');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://rubygems.org/api/v1/gems/rails.json',
      { method: 'HEAD' }
    );
  });

  it('checks go proxy for go packages', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
    });

    await checkPackageExists(makeStrategy('go'), 'gin-gonic/gin');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://proxy.golang.org/github.com/gin-gonic/gin/@v/list'
    );
  });
});
