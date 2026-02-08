import { DEFAULT_MAX, MAX_AVATARS } from './constants';
import { renderAvatar } from './avatar';
import { computeLayout, computePositions } from './layout';
import { renderDetailed } from './render-detailed';
import { renderMessage } from './render-message';
import type { AvatarData, RenderOptions } from './types';

export function renderMosaic(
  avatars: AvatarData[],
  options?: RenderOptions
): string {
  const rawMax = options?.max ?? DEFAULT_MAX;
  const max =
    Number.isFinite(rawMax) && rawMax > 0
      ? Math.min(Math.floor(rawMax), MAX_AVATARS)
      : DEFAULT_MAX;

  const sliced = avatars.slice(0, max);

  if (sliced.length === 0) {
    return renderMessage('No dependents found', options?.theme);
  }

  if (options?.style === 'detailed') {
    return renderDetailed(sliced, options?.theme);
  }

  const layout = computeLayout(sliced.length);
  const positions = computePositions(sliced.length, layout);

  const fragments = sliced.map((avatar, i) =>
    renderAvatar(avatar, positions[i]!, layout.avatarSize)
  );

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-label="Dependents">`,
    `<defs>${fragments.map((f) => f.def).join('')}</defs>`,
    fragments.map((f) => f.body).join(''),
    '</svg>',
  ].join('');
}
