import type { AvatarData, AvatarFragment, AvatarPosition } from './types';

export function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&#39;');
}

export function renderAvatar(
  avatar: AvatarData,
  position: AvatarPosition,
  avatarSize: number
): AvatarFragment {
  const clipId = `clip-${position.index}`;
  const radius = avatarSize / 2;
  const x = position.cx - radius;
  const y = position.cy - radius;
  const href = `https://github.com/${escapeAttr(avatar.fullName)}`;

  return {
    def: `<clipPath id="${clipId}"><circle cx="${position.cx}" cy="${position.cy}" r="${radius}"/></clipPath>`,
    body: `<a href="${href}"><image href="${escapeAttr(avatar.dataUri)}" x="${x}" y="${y}" width="${avatarSize}" height="${avatarSize}" clip-path="url(#${clipId})"/></a>`,
  };
}
