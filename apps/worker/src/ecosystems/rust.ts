import type { EcosystemStrategy } from './strategy';

export const rustStrategy: EcosystemStrategy = {
  platform: 'cargo',
  manifestFilename: 'Cargo.toml',
  packageNamePattern: /^[a-zA-Z][a-zA-Z0-9_-]*$/,

  buildSearchQuery(packageName: string) {
    return `"${packageName}" filename:Cargo.toml`;
  },

  isDependency(manifestContent: string, packageName: string) {
    const escaped = escapeRegex(packageName);

    // Simple: serde = "1.0"
    const simplePattern = new RegExp(`^\\s*${escaped}\\s*=\\s*"([^"]*)"`, 'm');
    const simpleMatch = manifestContent.match(simplePattern);
    if (simpleMatch) {
      return { found: true, version: simpleMatch[1] };
    }

    // Inline table: serde = { version = "1.0", ... }
    const tablePattern = new RegExp(
      `^\\s*${escaped}\\s*=\\s*\\{[^}]*version\\s*=\\s*"([^"]*)"`,
      'm'
    );
    const tableMatch = manifestContent.match(tablePattern);
    if (tableMatch) {
      return { found: true, version: tableMatch[1] };
    }

    // Dotted key: serde.version = "1.0"
    const dottedPattern = new RegExp(`^\\s*${escaped}\\.`, 'm');
    if (dottedPattern.test(manifestContent)) {
      const dottedVersionPattern = new RegExp(
        `^\\s*${escaped}\\.version\\s*=\\s*"([^"]*)"`,
        'm'
      );
      const dottedMatch = manifestContent.match(dottedVersionPattern);
      return { found: true, version: dottedMatch?.[1] };
    }

    return { found: false };
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

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
