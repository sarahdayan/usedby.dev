import { AVATAR_FETCH_SIZE, FETCH_CONCURRENCY } from './constants';
import type { AvatarData } from './types';
import type { ScoredRepo } from '../github/types';

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

async function fetchOne(repo: ScoredRepo): Promise<AvatarData> {
  const url = `${repo.avatarUrl}?s=${AVATAR_FETCH_SIZE}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch avatar for ${repo.fullName}: ${response.status}`
    );
  }

  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') ?? 'image/png';
  const base64 = toBase64(buffer);

  return {
    dataUri: `data:${contentType};base64,${base64}`,
    fullName: repo.fullName,
  };
}

export async function fetchAvatars(repos: ScoredRepo[]): Promise<AvatarData[]> {
  const avatars: AvatarData[] = [];

  for (let start = 0; start < repos.length; start += FETCH_CONCURRENCY) {
    const batch = repos.slice(start, start + FETCH_CONCURRENCY);
    const results = await Promise.allSettled(batch.map(fetchOne));

    for (let i = 0; i < results.length; i++) {
      const result = results[i]!;
      if (result.status === 'fulfilled') {
        avatars.push(result.value);
      } else {
        console.warn(
          `Skipping avatar for ${batch[i]!.fullName}: ${result.reason}`
        );
      }
    }
  }

  return avatars;
}
