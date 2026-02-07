import { RequestError } from '@octokit/request-error';

const MAX_BACKOFF_MS = 60_000;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRateLimitError(error: unknown): error is RequestError {
  return (
    error instanceof RequestError &&
    error.status === 403 &&
    error.response?.headers['x-ratelimit-remaining'] === '0'
  );
}

export function isSecondaryRateLimitError(
  error: unknown
): error is RequestError {
  return (
    error instanceof RequestError &&
    error.status === 403 &&
    error.response?.headers['retry-after'] !== undefined
  );
}

export function getRateLimitReset(error: RequestError): number | null {
  const reset = error.response?.headers['x-ratelimit-reset'];

  if (reset === undefined || reset === '') {
    return null;
  }

  const timestamp = Number(reset);

  return Number.isNaN(timestamp) ? null : timestamp;
}

export function getRetryAfter(error: RequestError): number | null {
  const retryAfter = error.response?.headers['retry-after'];

  if (retryAfter === undefined || retryAfter === '') {
    return null;
  }

  const seconds = Number(retryAfter);

  return Number.isNaN(seconds) || seconds <= 0 ? null : seconds * 1000;
}

export function getRetryDelay(
  attempt: number,
  resetTimestamp?: number | null
): number {
  if (resetTimestamp != null) {
    const delayMs = resetTimestamp * 1000 - Date.now();

    if (delayMs > 0) {
      return Math.min(delayMs, MAX_BACKOFF_MS);
    }
  }

  const baseMs = 1000 * 2 ** attempt;
  const jitter = Math.random() * 1000;

  return Math.min(baseMs + jitter, MAX_BACKOFF_MS);
}
