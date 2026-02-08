import { renderAvatar } from './avatar';
import {
  BADGE_FONT_SIZE,
  BADGE_GAP,
  BADGE_HEIGHT,
  BADGE_PADDING_X,
} from './constants';
import { formatCount } from './format-count';
import { computeLayout, computePositions } from './layout';
import { renderDetailed } from './render-detailed';
import { renderMessage } from './render-message';
import { renderThemeStyle } from './theme';
import type { AvatarData, RenderOptions } from './types';

export function renderMosaic(
  avatars: AvatarData[],
  options?: RenderOptions
): string {
  if (avatars.length === 0) {
    return renderMessage('No dependents found', options?.theme);
  }

  if (options?.style === 'detailed') {
    return renderDetailed(avatars, options?.theme, options?.dependentCount);
  }

  const layout = computeLayout(avatars.length);
  const positions = computePositions(avatars.length, layout);

  const fragments = avatars.map((avatar, i) =>
    renderAvatar(avatar, positions[i]!, layout.avatarSize)
  );

  const dependentCount = options?.dependentCount;
  const hasBadge = dependentCount != null && dependentCount > 0;
  const svgHeight = hasBadge
    ? layout.height + BADGE_GAP + BADGE_HEIGHT
    : layout.height;

  let badgeFragment = '';
  if (hasBadge) {
    const label = `Used by ${formatCount(dependentCount)} repositories`;
    const pillWidth = label.length * 7.2 + BADGE_PADDING_X * 2;
    const pillX = layout.width / 2 - pillWidth / 2;
    const pillY = layout.height + BADGE_GAP;
    const pillRx = BADGE_HEIGHT / 2;
    badgeFragment = `<rect x="${pillX}" y="${pillY}" width="${pillWidth}" height="${BADGE_HEIGHT}" rx="${pillRx}" class="badge-bg"/><text x="${layout.width / 2}" y="${pillY + BADGE_HEIGHT / 2}" text-anchor="middle" dominant-baseline="central" class="text-secondary" font-family="system-ui, -apple-system, sans-serif" font-size="${BADGE_FONT_SIZE}" font-weight="600">${label}</text>`;
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${svgHeight}" viewBox="0 0 ${layout.width} ${svgHeight}" role="img" aria-label="Dependents">`,
    renderThemeStyle(options?.theme),
    `<defs>${fragments.map((f) => f.def).join('')}</defs>`,
    fragments.map((f) => f.body).join(''),
    badgeFragment,
    '</svg>',
  ].join('');
}
