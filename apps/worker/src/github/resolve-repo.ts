import type { DevLogger } from '../dev-logger';

export async function resolveGitHubRepo(
  packageName: string,
  logger?: DevLogger
): Promise<{ owner: string; repo: string } | null> {
  try {
    const response = await fetch(`https://registry.npmjs.org/${packageName}`);

    if (!response.ok) {
      logger?.log(
        '  npm-registry',
        `${response.status} ${response.statusText}`
      );
      return null;
    }

    const data = (await response.json()) as {
      repository?: { url?: string };
    };
    const url = data?.repository?.url;

    if (typeof url !== 'string') {
      logger?.log('  npm-registry', 'no repository.url field');
      return null;
    }

    const match = url.match(/github\.com[/:]([^/]+)\/([^/#]+)/);

    if (!match) {
      logger?.log('  npm-registry', `not a GitHub URL: ${url}`);
      return null;
    }

    const owner = match[1]!;
    const repo = match[2]!.replace(/\.git$/, '');
    logger?.log('  npm-registry', `${owner}/${repo} (from ${url})`);

    return { owner, repo };
  } catch {
    return null;
  }
}
