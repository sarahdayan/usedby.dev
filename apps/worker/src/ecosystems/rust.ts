import type { EcosystemStrategy } from './strategy';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const rustStrategy: EcosystemStrategy = {
  platform: 'cargo',
  manifestFilename: 'Cargo.toml',
  packageNamePattern: /^[a-zA-Z][a-zA-Z0-9_-]*$/,

  buildSearchQuery(packageName: string) {
    return `"${packageName}" filename:Cargo.toml`;
  },

  isDependency(manifestContent: string, packageName: string) {
    const escaped = escapeRegex(packageName);
    const pattern = new RegExp(`^\\s*${escaped}\\s*[=.]`, 'm');

    return pattern.test(manifestContent);
  },

  async resolveGitHubRepo(packageName: string) {
    try {
      const response = await fetch(
        `https://crates.io/api/v1/crates/${packageName}`,
        {
          headers: { 'User-Agent': 'usedby.dev' },
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as {
        crate?: { repository?: string };
      };
      const url = data?.crate?.repository;

      if (typeof url !== 'string') {
        return null;
      }

      const match = url.match(/github\.com[/:]([^/]+)\/([^/#]+)/);

      if (!match) {
        return null;
      }

      const owner = match[1]!;
      const repo = match[2]!.replace(/\.git$/, '');

      return { owner, repo };
    } catch {
      return null;
    }
  },
};
