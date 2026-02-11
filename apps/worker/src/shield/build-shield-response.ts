import { formatCount } from '../svg/format-count';

export interface ShieldResponse {
  schemaVersion: 1;
  label: string;
  message: string;
  color: string;
  isError?: boolean;
}

export function buildShieldSuccess(count: number): ShieldResponse {
  const message = `${formatCount(count)} ${count === 1 ? 'project' : 'projects'}`;

  return {
    schemaVersion: 1,
    label: 'used by',
    message,
    color: count === 0 ? 'lightgrey' : 'brightgreen',
  };
}

export function buildShieldUnavailable(): ShieldResponse {
  return {
    schemaVersion: 1,
    label: 'used by',
    message: 'unavailable',
    color: 'lightgrey',
  };
}

export function buildShieldError(): ShieldResponse {
  return {
    schemaVersion: 1,
    label: 'used by',
    message: 'error',
    color: 'red',
    isError: true,
  };
}
