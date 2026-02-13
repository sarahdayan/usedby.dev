'use client';

import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Loader2Icon } from 'lucide-react';

import { API_BASE } from '@/lib/api';

interface PendingPageProps {
  registry: string;
  packageName: string;
}

class PermanentError extends Error {}

async function fetcher(url: string) {
  const res = await fetch(url);

  if (res.status === 202) {
    return null;
  }

  if (res.status === 404) {
    throw new PermanentError('Package not found');
  }

  if (!res.ok) {
    throw new Error('Failed to fetch');
  }

  return res.json();
}

export function PendingPage({ registry, packageName }: PendingPageProps) {
  const router = useRouter();

  useSWR(`${API_BASE}/${registry}/${packageName}/data.json`, fetcher, {
    refreshInterval: 3_000,
    onSuccess(data) {
      if (data) {
        router.refresh();
      }
    },
    onErrorRetry(error, _key, _config, revalidate, { retryCount }) {
      if (error instanceof PermanentError) {
        return;
      }
      setTimeout(() => revalidate({ retryCount }), 3_000);
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-16 text-center">
      <Loader2Icon className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
      <p className="mt-4 text-lg font-medium text-foreground">
        First visit! Scanning GitHub for dependents.
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        This usually takes 15&ndash;30 seconds.
      </p>
    </div>
  );
}
