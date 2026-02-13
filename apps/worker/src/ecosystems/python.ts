import type { EcosystemStrategy } from './strategy';

const PROJECT_URL_KEYS = [
  'Repository',
  'Source',
  'Source Code',
  'GitHub',
  'Homepage',
] as const;

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[-_.]/g, '-');
}

export const pythonStrategy: EcosystemStrategy = {
  platform: 'pypi',
  manifestFilename: 'requirements.txt',
  packageNamePattern: /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?$/,

  buildSearchQuery(packageName: string) {
    return `"${packageName}" filename:requirements.txt`;
  },

  isDependency(manifestContent: string, packageName: string) {
    const normalizedTarget = normalizeName(packageName);
    const lines = manifestContent.split('\n');

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (
        line === '' ||
        line.startsWith('#') ||
        line.startsWith('-r') ||
        line.startsWith('-c') ||
        line.startsWith('-e') ||
        line.startsWith('-f') ||
        line.startsWith('--')
      ) {
        continue;
      }

      const match = line.match(/^([a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?)/);

      if (!match) {
        continue;
      }

      if (normalizeName(match[1]!) === normalizedTarget) {
        const rest = line.slice(match[0].length);
        const afterExtras = rest.replace(/^\[[^\]]*\]/, '');
        const versionMatch = afterExtras.match(/^([><=!~]+.+)/);
        const version = versionMatch ? versionMatch[1]!.trim() : undefined;
        return { found: true, version };
      }
    }

    return { found: false };
  },

  async resolveGitHubRepo(packageName: string) {
    try {
      const response = await fetch(`https://pypi.org/pypi/${packageName}/json`);

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as {
        info?: { project_urls?: Record<string, string> };
      };
      const projectUrls = data?.info?.project_urls;

      if (projectUrls == null || typeof projectUrls !== 'object') {
        return null;
      }

      for (const key of PROJECT_URL_KEYS) {
        const url = projectUrls[key];

        if (typeof url !== 'string') {
          continue;
        }

        const match = url.match(/github\.com[/:]([^/]+)\/([^/#]+)/);

        if (!match) {
          continue;
        }

        const owner = match[1]!;
        const repo = match[2]!.replace(/\.git$/, '');

        return { owner, repo };
      }

      return null;
    } catch {
      return null;
    }
  },
};
