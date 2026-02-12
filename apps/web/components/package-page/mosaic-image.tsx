'use client';

import { useCallback, useState } from 'react';

import { ToggleGroup } from '@/components/toggle-group';
import { API_BASE } from '@/lib/api';

type Style = 'mosaic' | 'detailed';

interface MosaicImageProps {
  platform: string;
  packageName: string;
}

export function MosaicImage({ platform, packageName }: MosaicImageProps) {
  const [style, setStyle] = useState<Style>('mosaic');
  const [imageLoaded, setImageLoaded] = useState(false);

  const url = `${API_BASE}/${platform}/${packageName}${style === 'detailed' ? '?style=detailed' : ''}`;

  const imgRef = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete) {
      setImageLoaded(true);
    }
  }, []);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-xs font-medium text-muted-foreground">
          Preview
        </span>
        <ToggleGroup
          options={[
            { label: 'Mosaic', value: 'mosaic' as Style },
            { label: 'Detailed', value: 'detailed' as Style },
          ]}
          value={style}
          onChange={(v) => {
            setStyle(v);
            setImageLoaded(false);
          }}
        />
      </div>
      <div className="relative min-h-[200px] p-4">
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        )}
        <img
          ref={imgRef}
          key={url}
          src={url}
          alt={`Projects using ${packageName}`}
          className={`w-full transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(true)}
        />
      </div>
    </div>
  );
}
