export interface PipelineLimits {
  /** Max pages to fetch from GitHub code search (each page = 1 subrequest). */
  maxPages: number;
  /** Max repos to send through enrichment (ceil(enrichCap/batchSize) = subrequests). */
  enrichCap: number;
  /** Repos per GraphQL batch request. GitHub GraphQL has a node/complexity limit. */
  batchSize: number;
  /** Max enrichment batches to run concurrently. */
  enrichConcurrency: number;
  /** Delay between search pages to avoid secondary rate limits (ms). */
  pageDelayMs: number;
  /** Minimum star count to survive post-enrichment filtering. */
  minStars: number;
  /** Default number of dependents to display (each avatar = 1 subrequest). */
  defaultMax: number;
}

/** Cloudflare Workers free plan: 50 subrequests/request.
 *  Budget: ~5 search + 2 enrich + ~35 avatars = ~42 of 50. */
export const FREE_LIMITS: PipelineLimits = {
  maxPages: 5,
  enrichCap: 100,
  batchSize: 50,
  enrichConcurrency: 2,
  pageDelayMs: 6_500,
  minStars: 5,
  defaultMax: 35,
};

/** Cloudflare Workers paid plan: 1,000 subrequests/request.
 *  Budget: ~10 search + 10 enrich + ~100 avatars = ~120 of 1,000. */
export const PAID_LIMITS: PipelineLimits = {
  maxPages: 10,
  enrichCap: 500,
  batchSize: 50,
  enrichConcurrency: 3,
  pageDelayMs: 4_000,
  minStars: 5,
  defaultMax: 100,
};

/** @deprecated Use PAID_LIMITS or FREE_LIMITS instead. */
export const PROD_LIMITS: PipelineLimits = PAID_LIMITS;

/** Local dev (wrangler dev): no subrequest limit, only GitHub rate limit (5k/hr). */
export const DEV_LIMITS: PipelineLimits = {
  maxPages: 10,
  enrichCap: 500,
  batchSize: 50,
  enrichConcurrency: 3,
  pageDelayMs: 4_000,
  minStars: 5,
  defaultMax: 100,
};

export function getLimits(dev: boolean): PipelineLimits {
  return dev ? DEV_LIMITS : PAID_LIMITS;
}
