export interface ParsedCacheKey {
  platform: string;
  packageName: string;
}

export function parseCacheKey(key: string): ParsedCacheKey | null {
  const colonIndex = key.indexOf(':');

  if (colonIndex === -1) {
    return null;
  }

  const platform = key.slice(0, colonIndex);
  const packageName = key.slice(colonIndex + 1);

  if (platform === '' || packageName === '') {
    return null;
  }

  return { platform, packageName };
}
