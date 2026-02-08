export interface PipelineLimits {
  /** Max pages to fetch from GitHub code search (each page = 1 subrequest). */
  maxPages: number;
  /** Max repos to send through enrichment (ceil(enrichCap/batchSize) = subrequests). */
  enrichCap: number;
  /** Repos per GraphQL batch request. GitHub GraphQL has a node/complexity limit. */
  batchSize: number;
  /** Delay between search pages to avoid secondary rate limits (ms). */
  pageDelayMs: number;
  /** Minimum star count to survive post-enrichment filtering. */
  minStars: number;
  /** Default number of dependents to display (each avatar = 1 subrequest). */
  defaultMax: number;
}

/** Cloudflare Workers free plan: 50 subrequests/request.
 *  Budget: ~5 search + 2 enrich + ~35 avatars = ~42 of 50. */
export const PROD_LIMITS: PipelineLimits = {
  maxPages: 5,
  enrichCap: 100,
  batchSize: 50,
  pageDelayMs: 6_500,
  minStars: 5,
  defaultMax: 35,
};

/** Local dev (wrangler dev): no subrequest limit, only GitHub rate limit (5k/hr). */
export const DEV_LIMITS: PipelineLimits = {
  maxPages: 10,
  enrichCap: 500,
  batchSize: 50,
  pageDelayMs: 2_000,
  minStars: 5,
  defaultMax: 100,
};

export function getLimits(dev: boolean): PipelineLimits {
  return dev ? DEV_LIMITS : PROD_LIMITS;
}
