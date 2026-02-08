import {
  BADGE_FONT_SIZE,
  BADGE_GAP,
  BADGE_HEIGHT,
  BADGE_PADDING_X,
  DETAILED_AVATAR_SIZE,
  DETAILED_CARD_HEIGHT,
  DETAILED_CARD_WIDTH,
  DETAILED_COLUMNS,
  DETAILED_GAP_X,
  DETAILED_GAP_Y,
  DETAILED_NAME_MAX_CHARS,
  DETAILED_TEXT_GAP,
  PADDING,
} from './constants';
import { formatCount } from './format-count';
import { escapeXml } from './avatar';
import type { Theme } from './theme';
import { renderThemeStyle } from './theme';
import type { AvatarData } from './types';

export function formatStars(n: number): string {
  if (n < 1000) {
    return String(n);
  }

  const thousands = n / 1000;

  if (thousands >= 100) {
    return `${Math.floor(thousands)}k`;
  }

  const formatted = thousands.toFixed(1);
  const rounded = parseFloat(formatted);

  if (rounded >= 100) {
    return `${Math.floor(rounded)}k`;
  }

  return `${formatted.endsWith('.0') ? Math.floor(rounded) : formatted}k`;
}

export function truncateName(name: string): string {
  if (name.length <= DETAILED_NAME_MAX_CHARS) {
    return name;
  }

  return `${name.slice(0, DETAILED_NAME_MAX_CHARS - 1)}…`;
}

export function renderDetailed(
  avatars: AvatarData[],
  theme?: Theme,
  dependentCount?: number
): string {
  if (avatars.length === 0) {
    return '';
  }

  const columns = Math.min(DETAILED_COLUMNS, avatars.length);
  const rows = Math.ceil(avatars.length / columns);
  const width =
    PADDING * 2 +
    columns * DETAILED_CARD_WIDTH +
    (columns - 1) * DETAILED_GAP_X;
  const hasBadge = dependentCount != null && dependentCount > 0;
  const gridHeight =
    PADDING * 2 + rows * DETAILED_CARD_HEIGHT + (rows - 1) * DETAILED_GAP_Y;
  const height = hasBadge ? gridHeight + BADGE_GAP + BADGE_HEIGHT : gridHeight;

  const defs: string[] = [];
  const bodies: string[] = [];

  for (let i = 0; i < avatars.length; i++) {
    const avatar = avatars[i]!;
    const col = i % columns;
    const row = Math.floor(i / columns);
    const x = PADDING + col * (DETAILED_CARD_WIDTH + DETAILED_GAP_X);
    const y = PADDING + row * (DETAILED_CARD_HEIGHT + DETAILED_GAP_Y);

    const clipId = `clip-${i}`;
    const radius = DETAILED_AVATAR_SIZE / 2;
    const cx = x + radius;
    const cy = y + DETAILED_CARD_HEIGHT / 2;
    const imgX = x;
    const imgY = cy - radius;

    const textX = x + DETAILED_AVATAR_SIZE + DETAILED_TEXT_GAP;

    const displayName = truncateName(avatar.fullName);
    const escapedName = escapeXml(displayName);
    const href = `https://github.com/${escapeXml(avatar.fullName)}`;

    const starsText =
      avatar.stars !== undefined ? `★ ${formatStars(avatar.stars)}` : '';

    defs.push(
      `<clipPath id="${clipId}"><circle cx="${cx}" cy="${cy}" r="${radius}"/></clipPath>`
    );

    bodies.push(
      [
        `<a href="${href}">`,
        `<image href="${escapeXml(avatar.dataUri)}" x="${imgX}" y="${imgY}" width="${DETAILED_AVATAR_SIZE}" height="${DETAILED_AVATAR_SIZE}" clip-path="url(#${clipId})"/>`,
        `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" class="avatar-border"/>`,
        `<text x="${textX}" y="${y + 28}" class="text-primary" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="600">`,
        `${escapedName}</text>`,
        `<text x="${textX}" y="${y + 46}" class="text-secondary" font-family="system-ui, -apple-system, sans-serif" font-size="12">`,
        `${starsText}</text>`,
        `</a>`,
      ].join('')
    );
  }

  let badgeFragment = '';
  if (hasBadge) {
    const label = `Used by ${formatCount(dependentCount)} repositories`;
    const pillWidth = label.length * 7.2 + BADGE_PADDING_X * 2;
    const pillX = width / 2 - pillWidth / 2;
    const pillY = gridHeight + BADGE_GAP;
    const pillRx = BADGE_HEIGHT / 2;
    badgeFragment = `<rect x="${pillX}" y="${pillY}" width="${pillWidth}" height="${BADGE_HEIGHT}" rx="${pillRx}" class="badge-bg"/><text x="${width / 2}" y="${pillY + BADGE_HEIGHT / 2}" text-anchor="middle" dominant-baseline="central" class="text-secondary" font-family="system-ui, -apple-system, sans-serif" font-size="${BADGE_FONT_SIZE}" font-weight="600">${label}</text>`;
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Used by">`,
    renderThemeStyle(theme),
    `<defs>${defs.join('')}</defs>`,
    bodies.join(''),
    badgeFragment,
    '</svg>',
  ].join('');
}
