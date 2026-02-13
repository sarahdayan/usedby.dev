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
  version?: string;
}

export interface PackageData {
  package: string;
  platform: string;
  dependentCount: number;
  fetchedAt: string;
  repos: PackageRepo[];
  versionDistribution: Record<string, number>;
}

export async function fetchPackageData(
  platform: string,
  packageName: string
): Promise<PackageData | null> {
  const res = await fetch(`${API_BASE}/${platform}/${packageName}/data.json`, {
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    return null;
  }

  return res.json();
}
