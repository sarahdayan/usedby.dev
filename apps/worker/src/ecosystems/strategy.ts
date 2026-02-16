export interface DependencyResult {
  found: boolean;
  version?: string;
  depType?:
    | 'dependencies'
    | 'devDependencies'
    | 'peerDependencies'
    | 'optionalDependencies';
}

export interface EcosystemStrategy {
  readonly platform: string;
  readonly manifestFilename: string;
  readonly packageNamePattern: RegExp;

  buildSearchQuery(packageName: string): string;
  isDependency(manifestContent: string, packageName: string): DependencyResult;
  resolveGitHubRepo(
    packageName: string
  ): Promise<{ owner: string; repo: string } | null>;
}
