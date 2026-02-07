import { AVATAR_SIZE, COLUMNS, GAP, PADDING } from './constants';
import type { AvatarPosition, LayoutConfig } from './types';

export function computeLayout(avatarCount: number): LayoutConfig {
  if (avatarCount <= 0) {
    return {
      columns: 0,
      rows: 0,
      avatarSize: AVATAR_SIZE,
      gap: GAP,
      padding: PADDING,
      width: 0,
      height: 0,
    };
  }

  const columns = Math.min(avatarCount, COLUMNS);
  const rows = Math.ceil(avatarCount / columns);

  const width = PADDING * 2 + columns * AVATAR_SIZE + (columns - 1) * GAP;
  const height = PADDING * 2 + rows * AVATAR_SIZE + (rows - 1) * GAP;

  return {
    columns,
    rows,
    avatarSize: AVATAR_SIZE,
    gap: GAP,
    padding: PADDING,
    width,
    height,
  };
}

export function computePositions(
  avatarCount: number,
  layout: LayoutConfig
): AvatarPosition[] {
  const positions: AvatarPosition[] = [];
  const radius = layout.avatarSize / 2;

  for (let i = 0; i < avatarCount; i++) {
    const col = i % layout.columns;
    const row = Math.floor(i / layout.columns);

    positions.push({
      cx: layout.padding + col * (layout.avatarSize + layout.gap) + radius,
      cy: layout.padding + row * (layout.avatarSize + layout.gap) + radius,
      index: i,
    });
  }

  return positions;
}
