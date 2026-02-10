import type { EcosystemStrategy } from './strategy';

export const rubyStrategy: EcosystemStrategy = {
  platform: 'rubygems',
  manifestFilename: 'Gemfile',
  packageNamePattern: /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/,

  buildSearchQuery(packageName: string) {
    return `"${packageName}" filename:Gemfile`;
  },

  isDependency(manifestContent: string, packageName: string) {
    const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(
      `^\\s*gem\\s+(['"])${escaped}\\1(?:\\s*,|\\s*$)`,
      'm'
    );

    return pattern.test(manifestContent);
  },

  async resolveGitHubRepo(packageName: string) {
    try {
      const response = await fetch(
        `https://rubygems.org/api/v1/gems/${packageName}.json`
      );

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as {
        source_code_uri?: string;
        homepage_uri?: string;
      };
      const url = data?.source_code_uri ?? data?.homepage_uri;

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
