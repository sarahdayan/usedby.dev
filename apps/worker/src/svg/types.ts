export interface RenderOptions {
  max?: number;
}

export interface LayoutConfig {
  columns: number;
  rows: number;
  avatarSize: number;
  gap: number;
  padding: number;
  width: number;
  height: number;
}

export interface AvatarPosition {
  cx: number;
  cy: number;
  index: number;
}

export interface AvatarData {
  dataUri: string;
  fullName: string;
}

export interface AvatarFragment {
  def: string;
  body: string;
}
