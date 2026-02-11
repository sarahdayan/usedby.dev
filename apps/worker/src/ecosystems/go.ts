import type { EcosystemStrategy } from './strategy';

export const goStrategy: EcosystemStrategy = {
  platform: 'go',
  manifestFilename: 'go.mod',
  packageNamePattern: /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+$/,

  buildSearchQuery(packageName: string) {
    return `"github.com/${packageName}" filename:go.mod`;
  },

  isDependency(manifestContent: string, packageName: string) {
    const escaped = escapeRegex(packageName);
    const pattern = new RegExp(
      `^(?:require\\s+|\\s+)github\\.com/${escaped}\\s`,
      'm'
    );

    return pattern.test(manifestContent);
  },

  async resolveGitHubRepo(packageName: string) {
    const parts = packageName.split('/');

    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return null;
    }

    return { owner: parts[0], repo: parts[1] };
  },
};

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
