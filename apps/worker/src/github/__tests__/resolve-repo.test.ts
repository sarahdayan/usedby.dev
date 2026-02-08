import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveGitHubRepo } from '../resolve-repo';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('resolveGitHubRepo', () => {
  it('resolves a package with a standard GitHub URL', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          repository: { url: 'https://github.com/facebook/react.git' },
        })
      )
    );

    const result = await resolveGitHubRepo('react');

    expect(result).toEqual({ owner: 'facebook', repo: 'react' });
    expect(fetch).toHaveBeenCalledWith('https://registry.npmjs.org/react');
  });

  it('resolves a git+https URL', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          repository: {
            url: 'git+https://github.com/algolia/instantsearch.git',
          },
        })
      )
    );

    const result = await resolveGitHubRepo('instantsearch.js');

    expect(result).toEqual({ owner: 'algolia', repo: 'instantsearch' });
  });

  it('resolves a git:// URL', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          repository: { url: 'git://github.com/org/repo.git' },
        })
      )
    );

    const result = await resolveGitHubRepo('some-package');

    expect(result).toEqual({ owner: 'org', repo: 'repo' });
  });

  it('resolves an SSH URL', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          repository: { url: 'git@github.com:org/repo.git' },
        })
      )
    );

    const result = await resolveGitHubRepo('some-package');

    expect(result).toEqual({ owner: 'org', repo: 'repo' });
  });

  it('returns null when npm registry returns non-200', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Not Found', { status: 404 })
    );

    const result = await resolveGitHubRepo('nonexistent-pkg');

    expect(result).toBeNull();
  });

  it('returns null when repository field is missing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ name: 'some-pkg' }))
    );

    const result = await resolveGitHubRepo('some-pkg');

    expect(result).toBeNull();
  });

  it('returns null when repository.url is not a GitHub URL', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          repository: { url: 'https://gitlab.com/org/repo.git' },
        })
      )
    );

    const result = await resolveGitHubRepo('some-pkg');

    expect(result).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));

    const result = await resolveGitHubRepo('some-pkg');

    expect(result).toBeNull();
  });

  it('preserves dots in repo names', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          repository: {
            url: 'git+https://github.com/dinerojs/dinero.js.git',
          },
        })
      )
    );

    const result = await resolveGitHubRepo('dinero.js');

    expect(result).toEqual({ owner: 'dinerojs', repo: 'dinero.js' });
  });

  it('handles scoped package names', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          repository: { url: 'https://github.com/babel/babel.git' },
        })
      )
    );

    const result = await resolveGitHubRepo('@babel/core');

    expect(result).toEqual({ owner: 'babel', repo: 'babel' });
    expect(fetch).toHaveBeenCalledWith(
      'https://registry.npmjs.org/@babel/core'
    );
  });
});
