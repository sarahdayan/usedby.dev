export interface ShieldResponse {
  schemaVersion: 1;
  label: string;
  message: string;
  color: string;
  isError?: boolean;
}

export function formatBadgeCount(count: number): string {
  if (count < 1_000) {
    return String(count);
  }

  if (count < 1_000_000) {
    if (count < 10_000) {
      const k = Math.floor(count / 100) / 10;
      return `${k % 1 === 0 ? String(k) : k.toFixed(1)}K+`;
    }

    return `${Math.floor(count / 1_000)}K+`;
  }

  if (count < 10_000_000) {
    const m = Math.floor(count / 100_000) / 10;
    return `${m % 1 === 0 ? String(m) : m.toFixed(1)}M+`;
  }

  return `${Math.floor(count / 1_000_000)}M+`;
}

export function buildShieldSuccess(count: number): ShieldResponse {
  const message = `${formatBadgeCount(count)} ${count === 1 ? 'project' : 'projects'}`;

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
