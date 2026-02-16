export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://api.usedby.dev';

export interface PackageRepo {
  fullName: string;
  owner: string;
  name: string;
  stars: number;
  lastPush: string;
  avatarUrl: string;
  score: number;
  archived?: boolean;
  version?: string;
  depType?: string;
}

export interface PackageData {
  package: string;
  platform: string;
  dependentCount: number;
  fetchedAt: string;
  repos: PackageRepo[];
  versionDistribution: Record<string, number>;
}

export type FetchResult =
  | { status: 'ready'; data: PackageData }
  | { status: 'pending' }
  | { status: 'not-found' };

export async function fetchPackageData(
  platform: string,
  packageName: string
): Promise<FetchResult> {
  const res = await fetch(`${API_BASE}/${platform}/${packageName}/data.json`, {
    next: { revalidate: 10 },
  });

  if (res.status === 202) {
    return { status: 'pending' };
  }

  if (!res.ok) {
    return { status: 'not-found' };
  }

  return { status: 'ready', data: await res.json() };
}
