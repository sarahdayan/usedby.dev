import { RequestError } from '@octokit/request-error';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getRetryAfter,
  getRetryDelay,
  getRateLimitReset,
  isRateLimitError,
  isSecondaryRateLimitError,
} from '../rate-limit';

afterEach(() => vi.restoreAllMocks());

function createRequestError(
  status: number,
  headers: Record<string, string> = {}
): RequestError {
  return new RequestError('test error', status, {
    request: {
      method: 'GET',
      url: 'https://api.github.com/search/code',
      headers: {},
    },
    response: {
      status,
      url: 'https://api.github.com/search/code',
      headers,
      data: {},
    },
  });
}

describe('isRateLimitError', () => {
  it('returns true for 403 with x-ratelimit-remaining: 0', () => {
    const error = createRequestError(403, { 'x-ratelimit-remaining': '0' });

    expect(isRateLimitError(error)).toBe(true);
  });

  it('returns true when both rate limit and retry-after headers are present', () => {
    const error = createRequestError(403, {
      'x-ratelimit-remaining': '0',
      'retry-after': '60',
    });

    expect(isRateLimitError(error)).toBe(true);
  });

  it('returns false for 403 without rate limit header', () => {
    const error = createRequestError(403);

    expect(isRateLimitError(error)).toBe(false);
  });

  it('returns false for 403 with remaining > 0', () => {
    const error = createRequestError(403, { 'x-ratelimit-remaining': '5' });

    expect(isRateLimitError(error)).toBe(false);
  });

  it('returns false for non-403 status', () => {
    const error = createRequestError(500, { 'x-ratelimit-remaining': '0' });

    expect(isRateLimitError(error)).toBe(false);
  });

  it('returns false for non-RequestError', () => {
    expect(isRateLimitError(new Error('random'))).toBe(false);
  });
});

describe('isSecondaryRateLimitError', () => {
  it('returns true for 403 with retry-after header', () => {
    const error = createRequestError(403, { 'retry-after': '60' });

    expect(isSecondaryRateLimitError(error)).toBe(true);
  });

  it('returns false for 403 without retry-after', () => {
    const error = createRequestError(403);

    expect(isSecondaryRateLimitError(error)).toBe(false);
  });

  it('returns false for non-403 status', () => {
    const error = createRequestError(500, { 'retry-after': '60' });

    expect(isSecondaryRateLimitError(error)).toBe(false);
  });
});

describe('getRateLimitReset', () => {
  it('returns the reset timestamp from headers', () => {
    const error = createRequestError(403, {
      'x-ratelimit-reset': '1700000000',
    });

    expect(getRateLimitReset(error)).toBe(1700000000);
  });

  it('returns null when header is missing', () => {
    const error = createRequestError(403);

    expect(getRateLimitReset(error)).toBeNull();
  });

  it('returns null for non-numeric values', () => {
    const error = createRequestError(403, { 'x-ratelimit-reset': 'invalid' });

    expect(getRateLimitReset(error)).toBeNull();
  });

  it('returns null for empty string header', () => {
    const error = createRequestError(403, { 'x-ratelimit-reset': '' });

    expect(getRateLimitReset(error)).toBeNull();
  });
});

describe('getRetryAfter', () => {
  it('returns milliseconds from retry-after seconds', () => {
    const error = createRequestError(403, { 'retry-after': '60' });

    expect(getRetryAfter(error)).toBe(60_000);
  });

  it('returns null when header is missing', () => {
    const error = createRequestError(403);

    expect(getRetryAfter(error)).toBeNull();
  });

  it('returns null for empty string', () => {
    const error = createRequestError(403, { 'retry-after': '' });

    expect(getRetryAfter(error)).toBeNull();
  });

  it('returns null for non-numeric values', () => {
    const error = createRequestError(403, { 'retry-after': 'invalid' });

    expect(getRetryAfter(error)).toBeNull();
  });

  it('returns null for zero or negative values', () => {
    const error0 = createRequestError(403, { 'retry-after': '0' });
    const errorNeg = createRequestError(403, { 'retry-after': '-5' });

    expect(getRetryAfter(error0)).toBeNull();
    expect(getRetryAfter(errorNeg)).toBeNull();
  });
});

describe('getRetryDelay', () => {
  it('uses exponential backoff based on attempt', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    expect(getRetryDelay(0)).toBe(1000);
    expect(getRetryDelay(1)).toBe(2000);
    expect(getRetryDelay(2)).toBe(4000);
  });

  it('adds jitter to the delay', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    expect(getRetryDelay(0)).toBe(1500);
  });

  it('caps at 60 seconds', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    expect(getRetryDelay(10)).toBe(60_000);
  });

  it('uses reset timestamp when available and in the future', () => {
    const futureReset = Math.floor(Date.now() / 1000) + 30;

    const delay = getRetryDelay(0, futureReset);

    expect(delay).toBeGreaterThan(29_000);
    expect(delay).toBeLessThanOrEqual(30_100);
  });

  it('caps reset-based delay at 60 seconds', () => {
    const farFutureReset = Math.floor(Date.now() / 1000) + 120;

    expect(getRetryDelay(0, farFutureReset)).toBe(60_000);
  });

  it('falls back to exponential backoff when reset is in the past', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const pastReset = Math.floor(Date.now() / 1000) - 10;

    expect(getRetryDelay(0, pastReset)).toBe(1000);
  });

  it('falls back to exponential backoff when reset is null', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    expect(getRetryDelay(1, null)).toBe(2000);
  });

  it('falls back to exponential backoff when reset timestamp is 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    expect(getRetryDelay(0, 0)).toBe(1000);
  });
});
