import type { DevLogger } from '../dev-logger';

export async function fetchDependentCount(
  owner: string,
  repo: string,
  logger?: DevLogger
): Promise<number | null> {
  try {
    const url = `https://github.com/${owner}/${repo}/network/dependents`;
    const response = await fetch(url);

    if (!response.ok) {
      logger?.log(
        '  dependents-page',
        `${response.status} ${response.statusText}`
      );
      return null;
    }

    const html = await response.text();

    const anchorIndex = html.indexOf('dependent_type=REPOSITORY');

    if (anchorIndex === -1) {
      logger?.log('  dependents-page', 'no REPOSITORY anchor found');
      return null;
    }

    const region = html.slice(anchorIndex);
    const match = region.match(/([\d,]+)\s+Repositories/);

    if (!match) {
      logger?.log('  dependents-page', 'no "N Repositories" pattern found');
      return null;
    }

    const count = parseInt(match[1]!.replace(/,/g, ''), 10);
    logger?.log('  dependents-page', `raw match "${match[1]}" → ${count}`);

    return count;
  } catch {
    return null;
  }
}
