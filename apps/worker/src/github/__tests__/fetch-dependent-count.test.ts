import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchDependentCount } from '../fetch-dependent-count';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchDependentCount', () => {
  it('parses a simple count', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(buildHtml('42'))
    );

    const result = await fetchDependentCount('facebook', 'react');

    expect(result).toBe(42);
    expect(fetch).toHaveBeenCalledWith(
      'https://github.com/facebook/react/network/dependents'
    );
  });

  it('parses a count with commas', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(buildHtml('1,234,567'))
    );

    const result = await fetchDependentCount('org', 'repo');

    expect(result).toBe(1234567);
  });

  it('returns null when response is not ok', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Not Found', { status: 404 })
    );

    const result = await fetchDependentCount('org', 'repo');

    expect(result).toBeNull();
  });

  it('returns null when anchor is not found', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html><body>no dependents info</body></html>')
    );

    const result = await fetchDependentCount('org', 'repo');

    expect(result).toBeNull();
  });

  it('returns null when no number is found near the anchor', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html><body>dependent_type=REPOSITORY</body></html>')
    );

    const result = await fetchDependentCount('org', 'repo');

    expect(result).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));

    const result = await fetchDependentCount('org', 'repo');

    expect(result).toBeNull();
  });

  it('skips SVG attributes like width="16" inside the anchor', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(buildHtmlWithSvg('9,876'))
    );

    const result = await fetchDependentCount('org', 'repo');

    expect(result).toBe(9876);
  });
});

function buildHtml(count: string): string {
  return `<html><body>
    <a href="/facebook/react/network/dependents?dependent_type=PACKAGE">Packages</a>
    <a href="/facebook/react/network/dependents?dependent_type=REPOSITORY">
      ${count}
      Repositories
    </a>
  </body></html>`;
}

function buildHtmlWithSvg(count: string): string {
  return `<html><body>
    <a class="btn-link selected" href="/org/repo/network/dependents?dependent_type=REPOSITORY">
                <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon octicon-code-square">
    <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v12.5A1.75 1.75 0 0 1 14.25 16H1.75A1.75 1.75 0 0 1 0 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25Zm7.47 3.97a.75.75 0 0 1 1.06 0l2 2a.75.75 0 0 1 0 1.06l-2 2a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L10.69 8 9.22 6.53a.75.75 0 0 1 0-1.06ZM6.78 6.53 5.31 8l1.47 1.47a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215l-2-2a.75.75 0 0 1 0-1.06l2-2a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Z"></path>
</svg>
                ${count}
                Repositories
</a>
  </body></html>`;
}
