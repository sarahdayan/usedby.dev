export interface DependentRepo {
  owner: string;
  name: string;
  fullName: string;
  stars: number;
  lastPush: string;
  avatarUrl: string;
  isFork: boolean;
}

export interface SearchResult {
  repos: DependentRepo[];
  partial: boolean;
  rateLimited: boolean;
  capped: boolean;
}
