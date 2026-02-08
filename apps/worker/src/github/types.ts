export interface DependentRepo {
  owner: string;
  name: string;
  fullName: string;
  stars: number;
  lastPush: string;
  avatarUrl: string;
  isFork: boolean;
  archived: boolean;
  packageJsonPath: string;
}

export interface ScoredRepo extends DependentRepo {
  score: number;
}

export interface SearchResult {
  repos: DependentRepo[];
  partial: boolean;
  rateLimited: boolean;
  capped: boolean;
}

export interface EnrichResult {
  repos: DependentRepo[];
  rateLimited: boolean;
}
