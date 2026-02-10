export interface EcosystemStrategy {
  readonly platform: string;
  readonly manifestFilename: string;
  readonly packageNamePattern: RegExp;

  buildSearchQuery(packageName: string): string;
  isDependency(manifestContent: string, packageName: string): boolean;
  resolveGitHubRepo(
    packageName: string
  ): Promise<{ owner: string; repo: string } | null>;
}
