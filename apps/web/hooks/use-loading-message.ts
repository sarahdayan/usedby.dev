'use client';

import { useState, useEffect } from 'react';

export const LOADING_MESSAGES = [
  'Searching GitHub for dependents\u2026',
  'This can take a while on a cold start\u2026',
  'Checking manifest files\u2026',
  'Enriching repository metadata\u2026',
  'Politely asking GitHub for more data\u2026',
  'Filtering out forks and noise\u2026',
  'Scoring and ranking results\u2026',
  'Fetching project avatars\u2026',
  'Still going, not stuck\u2026',
  'Rendering the image\u2026',
  'GitHub rate limits are keeping us honest\u2026',
  'Wrapping things up\u2026',
  'Seriously, almost there\u2026',
  'Worth the wait, I promise\u2026',
];

export function useLoadingMessage(intervalMs = 2000) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(
      () => setIndex((i) => (i + 1) % LOADING_MESSAGES.length),
      intervalMs
    );
    return () => clearInterval(interval);
  }, [intervalMs]);

  return LOADING_MESSAGES[index]!;
}
