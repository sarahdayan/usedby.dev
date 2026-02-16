import type { EcosystemStrategy } from './strategy';

const DEP_KEYS = ['require', 'require-dev'] as const;

export const phpStrategy: EcosystemStrategy = {
  platform: 'composer',
  manifestFilename: 'composer.json',
  packageNamePattern:
    /^[a-z0-9]([a-z0-9_.-]*[a-z0-9])?\/[a-z0-9]([a-z0-9_.-]*[a-z0-9])?$/,

  buildSearchQuery(packageName: string) {
    return `"${packageName}" filename:composer.json`;
  },

  isDependency(manifestContent: string, packageName: string) {
    try {
      const parsed = JSON.parse(manifestContent) as Record<string, unknown>;

      for (const key of DEP_KEYS) {
        const deps = parsed[key];

        if (deps != null && typeof deps === 'object' && packageName in deps) {
          const version = (deps as Record<string, string>)[packageName];
          const depType =
            key === 'require-dev' ? 'devDependencies' : 'dependencies';
          return { found: true, version, depType };
        }
      }
    } catch {
      // Malformed JSON — treat as not a dependency
    }

    return { found: false };
  },

  async resolveGitHubRepo(packageName: string) {
    try {
      const [vendor, pkg] = packageName.split('/');
      const response = await fetch(
        `https://repo.packagist.org/p2/${vendor}/${pkg}.json`
      );

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as {
        packages?: Record<string, Array<{ source?: { url?: string } }>>;
      };
      const versions = data?.packages?.[packageName];

      if (!versions || versions.length === 0) {
        return null;
      }

      const url = versions[0]!.source?.url;

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
