'use client';

import { useState, useMemo, useCallback } from 'react';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

type Style = 'mosaic' | 'detailed';
type Sort = 'score' | 'stars';
type Theme = 'auto' | 'light' | 'dark';

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-secondary/50 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
            value === opt.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      aria-label={`Copy ${label}`}
    >
      {copied ? (
        <>
          <CheckIcon className="h-3.5 w-3.5 text-accent" />
          Copied
        </>
      ) : (
        <>
          <CopyIcon className="h-3.5 w-3.5" />
          Copy {label}
        </>
      )}
    </button>
  );
}

export function Playground() {
  const [packageName, setPackageName] = useState('dinero.js');
  const [max, setMax] = useState(30);
  const [style, setStyle] = useState<Style>('mosaic');
  const [sort, setSort] = useState<Sort>('score');
  const [theme, setTheme] = useState<Theme>('auto');
  const [imageLoaded, setImageLoaded] = useState(true);
  const [imageKey, setImageKey] = useState(0);

  const buildUrl = useCallback(
    (pkg: string) => {
      if (!pkg) return '';
      const base = `https://api.usedby.dev/npm/${encodeURIComponent(pkg)}`;
      const params = new URLSearchParams();
      if (style !== 'mosaic') params.set('style', style);
      if (max !== 35) params.set('max', String(max));
      if (sort !== 'score') params.set('sort', sort);
      if (theme !== 'auto') params.set('theme', theme);
      const qs = params.toString();
      return qs ? `${base}?${qs}` : base;
    },
    [style, max, sort, theme]
  );

  const imageUrl = useMemo(
    () => buildUrl(packageName),
    [packageName, buildUrl]
  );

  const markdownEmbed = useMemo(() => {
    if (!packageName) return '';
    return `[![Dependents](${imageUrl})](https://www.npmjs.com/package/${encodeURIComponent(packageName)}?activeTab=dependents)`;
  }, [packageName, imageUrl]);

  const htmlEmbed = useMemo(() => {
    if (!packageName) return '';
    return `<a href="https://www.npmjs.com/package/${encodeURIComponent(packageName)}?activeTab=dependents">\n  <img src="${imageUrl}" alt="Dependents" />\n</a>`;
  }, [packageName, imageUrl]);

  const handleLoadImage = () => {
    setImageLoaded(false);
    setImageKey((k) => k + 1);
  };

  return (
    <section
      id="playground"
      className="relative mx-auto max-w-6xl px-6 py-24 lg:py-32"
    >
      <div className="flex flex-col items-center">
        <p className="text-sm font-medium uppercase tracking-widest text-accent">
          Playground
        </p>
        <h2 className="mt-4 text-balance text-center text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Try it with your package
        </h2>
        <p className="mt-4 max-w-xl text-center text-lg leading-relaxed text-muted-foreground">
          Enter your npm package name, tweak the options, and preview the result
          in real time.
        </p>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1 rounded-xl border border-border bg-card p-6">
          <div className="space-y-2">
            <Label htmlFor="package-name" className="text-sm text-foreground">
              Package name
            </Label>
            <Input
              id="package-name"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              placeholder="e.g. react, @scope/package"
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-foreground">Max dependents</Label>
              <span className="font-mono text-sm text-muted-foreground">
                {max}
              </span>
            </div>
            <Slider
              value={[max]}
              onValueChange={(v) => setMax(v[0])}
              min={1}
              max={100}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-foreground">Style</Label>
            <div>
              <ToggleGroup
                options={[
                  { label: 'Mosaic', value: 'mosaic' },
                  { label: 'Detailed', value: 'detailed' },
                ]}
                value={style}
                onChange={setStyle}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-foreground">Sort</Label>
            <div>
              <ToggleGroup
                options={[
                  { label: 'Score', value: 'score' },
                  { label: 'Stars', value: 'stars' },
                ]}
                value={sort}
                onChange={setSort}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-foreground">Theme</Label>
            <div>
              <ToggleGroup
                options={[
                  { label: 'Auto', value: 'auto' },
                  { label: 'Light', value: 'light' },
                  { label: 'Dark', value: 'dark' },
                ]}
                value={theme}
                onChange={setTheme}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleLoadImage}
            disabled={!packageName}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Generate preview
          </button>
        </div>

        <div className="min-w-0 space-y-6 lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <span className="text-xs font-medium text-muted-foreground">
                Preview
              </span>
            </div>
            <div className="relative min-h-[200px] p-4">
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                </div>
              )}
              {packageName && (
                <img
                  key={imageKey}
                  src={imageUrl || '/placeholder.svg'}
                  alt={`Dependents of ${packageName}`}
                  className={`w-full transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageLoaded(true)}
                />
              )}
              {!packageName && (
                <div className="flex h-full min-h-[160px] items-center justify-center text-sm text-muted-foreground">
                  Enter a package name to see a preview
                </div>
              )}
            </div>
          </div>

          {packageName && (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Markdown
                  </span>
                  <CopyButton text={markdownEmbed} label="Markdown" />
                </div>
                <div className="overflow-x-auto p-4">
                  <pre className="font-mono text-sm leading-loose text-foreground">
                    <code>{markdownEmbed}</code>
                  </pre>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    HTML
                  </span>
                  <CopyButton text={htmlEmbed} label="HTML" />
                </div>
                <div className="overflow-x-auto p-4">
                  <pre className="font-mono text-sm leading-loose text-foreground">
                    <code>{htmlEmbed}</code>
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
