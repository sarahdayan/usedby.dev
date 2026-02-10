import type { EcosystemStrategy } from './strategy';

const DEP_KEYS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] as const;

export const npmStrategy: EcosystemStrategy = {
  platform: 'npm',
  manifestFilename: 'package.json',
  packageNamePattern: /^(@[a-zA-Z0-9._-]+\/)?[a-zA-Z0-9._-]+$/,

  buildSearchQuery(packageName: string) {
    return `"${packageName}" filename:package.json`;
  },

  isDependency(manifestContent: string, packageName: string) {
    try {
      const parsed = JSON.parse(manifestContent) as Record<string, unknown>;

      for (const key of DEP_KEYS) {
        const deps = parsed[key];

        if (deps != null && typeof deps === 'object' && packageName in deps) {
          return true;
        }
      }
    } catch {
      // Malformed JSON — treat as not a dependency
    }

    return false;
  },

  async resolveGitHubRepo(packageName: string) {
    try {
      const response = await fetch(`https://registry.npmjs.org/${packageName}`);

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as {
        repository?: { url?: string };
      };
      const url = data?.repository?.url;

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
