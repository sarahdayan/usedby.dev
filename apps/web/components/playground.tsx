'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { CodeSnippetCard } from '@/components/code-snippet-card';
import { ToggleGroup } from '@/components/toggle-group';
import { ECOSYSTEMS, getEcosystem, stripRegistryUrl } from '@/lib/ecosystems';

type EmbedType = 'image' | 'badge';
type Style = 'mosaic' | 'detailed';
type Sort = 'score' | 'stars';
type Theme = 'auto' | 'light' | 'dark';

export function Playground() {
  const [embedType, setEmbedType] = useState<EmbedType>('image');
  const [platform, setPlatform] = useState('npm');
  const [packageName, setPackageName] = useState('dinero.js');
  const [githubRepo, setGithubRepo] = useState('dinerojs/dinero.js');
  const [max, setMax] = useState(30);
  const [style, setStyle] = useState<Style>('mosaic');
  const [sort, setSort] = useState<Sort>('score');
  const [theme, setTheme] = useState<Theme>('auto');
  const [imageLoaded, setImageLoaded] = useState(true);
  const [activePackage, setActivePackage] = useState('');
  const [debouncedMax, setDebouncedMax] = useState(max);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isValidPackage =
    getEcosystem(platform).packageNamePattern.test(packageName);

  function buildUrl(pkg: string, maxValue: number) {
    if (!pkg) {
      return '';
    }
    const base = `https://api.usedby.dev/${platform}/${pkg}`;
    const params = new URLSearchParams();
    if (style !== 'mosaic') {
      params.set('style', style);
    }
    if (maxValue !== 35) {
      params.set('max', String(maxValue));
    }
    if (sort !== 'score') {
      params.set('sort', sort);
    }
    if (theme !== 'auto') {
      params.set('theme', theme);
    }
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }

  const imageUrl = buildUrl(packageName, max);

  const previewUrl = useMemo(
    () => buildUrl(activePackage, debouncedMax),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activePackage, platform, style, sort, theme, debouncedMax]
  );

  useEffect(() => {
    if (!activePackage) {
      return;
    }
    setImageLoaded(false);
  }, [previewUrl]); // activePackage is already a dependency of previewUrl

  useEffect(() => {
    if (!activePackage) {
      return;
    }
    clearTimeout(maxTimerRef.current);
    maxTimerRef.current = setTimeout(() => setDebouncedMax(max), 300);
    return () => clearTimeout(maxTimerRef.current);
  }, [max, activePackage]);

  const trimmedRepo = githubRepo.trim();
  const isValidRepo = /^[^/]+\/[^/]+$/.test(trimmedRepo);
  const dependentsUrl = isValidRepo
    ? `https://github.com/${trimmedRepo}/network/dependents`
    : '';

  const markdownEmbed = useMemo(() => {
    if (!packageName) {
      return '';
    }
    const img = dependentsUrl
      ? `[![Used by](${imageUrl})](${dependentsUrl})`
      : `![Used by](${imageUrl})`;
    return `${img}\nGenerated with [usedby.dev](https://usedby.dev/)`;
  }, [packageName, imageUrl, dependentsUrl]);

  const htmlEmbed = useMemo(() => {
    if (!packageName) {
      return '';
    }
    const img = dependentsUrl
      ? `<a href="${dependentsUrl}">\n  <img src="${imageUrl}" alt="Used by" />\n</a>`
      : `<img src="${imageUrl}" alt="Used by" />`;
    return `${img}\nGenerated with <a href="https://usedby.dev/">usedby.dev</a>`;
  }, [packageName, imageUrl, dependentsUrl]);

  function buildBadgeUrl(pkg: string) {
    if (!pkg) {
      return '';
    }
    return `https://img.shields.io/endpoint?url=https://api.usedby.dev/${platform}/${pkg}/shield.json`;
  }

  const badgeUrl = buildBadgeUrl(packageName);

  const badgePreviewUrl = useMemo(() => {
    if (!activePackage) {
      return '';
    }
    return `https://img.shields.io/endpoint?url=https://api.usedby.dev/${platform}/${activePackage}/shield.json`;
  }, [activePackage, platform]);

  const badgeMarkdownEmbed = useMemo(() => {
    if (!packageName) {
      return '';
    }
    return dependentsUrl
      ? `[![Used by](${badgeUrl})](${dependentsUrl})`
      : `![Used by](${badgeUrl})`;
  }, [packageName, badgeUrl, dependentsUrl]);

  const badgeHtmlEmbed = useMemo(() => {
    if (!packageName) {
      return '';
    }
    return dependentsUrl
      ? `<a href="${dependentsUrl}">\n  <img src="${badgeUrl}" alt="Used by" />\n</a>`
      : `<img src="${badgeUrl}" alt="Used by" />`;
  }, [packageName, badgeUrl, dependentsUrl]);

  const activeMarkdownEmbed =
    embedType === 'image' ? markdownEmbed : badgeMarkdownEmbed;
  const activeHtmlEmbed = embedType === 'image' ? htmlEmbed : badgeHtmlEmbed;

  const handleLoadImage = () => {
    if (!packageName) {
      return;
    }
    setImageLoaded(false);
    setDebouncedMax(max);
    setActivePackage(packageName);
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
          Enter your package name, tweak the options, and preview the result in
          real time.
        </p>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-6 xl:grid-cols-5">
        <div className="space-y-6 lg:col-span-3 xl:col-span-2 rounded-xl border border-border bg-card p-6">
          <div className="space-y-2">
            <Label className="text-sm text-foreground">Embed type</Label>
            <div>
              <ToggleGroup
                options={[
                  { label: 'Image', value: 'image' as EmbedType },
                  { label: 'Badge', value: 'badge' as EmbedType },
                ]}
                value={embedType}
                onChange={(type) => {
                  setEmbedType(type);
                  setActivePackage('');
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-foreground">Ecosystem</Label>
            <div className="sm:hidden">
              <Select
                value={platform}
                onValueChange={(id) => {
                  setPlatform(id);
                  const eco = getEcosystem(id);
                  setPackageName(eco.example);
                  setGithubRepo(eco.repo);
                  setActivePackage('');
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ECOSYSTEMS.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="hidden sm:block">
              <ToggleGroup
                options={ECOSYSTEMS.map((e) => ({
                  label: e.label,
                  value: e.id,
                }))}
                value={platform}
                onChange={(id) => {
                  setPlatform(id);
                  const eco = getEcosystem(id);
                  setPackageName(eco.example);
                  setGithubRepo(eco.repo);
                  setActivePackage('');
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="package-name" className="text-sm text-foreground">
              Package name
            </Label>
            <Input
              id="package-name"
              value={packageName}
              onChange={(e) =>
                setPackageName(
                  stripRegistryUrl(getEcosystem(platform), e.target.value)
                )
              }
              placeholder={getEcosystem(platform).placeholder}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="github-repo" className="text-sm text-foreground">
              GitHub repo{' '}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="github-repo"
              value={githubRepo}
              onChange={(e) =>
                setGithubRepo(
                  e.target.value.replace(/^https?:\/\/github\.com\//, '')
                )
              }
              placeholder="e.g. owner/repo or GitHub URL"
              className="font-mono text-sm"
            />
          </div>

          {embedType === 'image' && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-foreground">
                    Max dependents
                  </Label>
                  <span className="font-mono text-sm text-muted-foreground">
                    {max}
                  </span>
                </div>
                <Slider
                  value={[max]}
                  onValueChange={(v) => v[0] !== undefined && setMax(v[0])}
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
            </>
          )}

          <button
            type="button"
            onClick={handleLoadImage}
            disabled={!isValidPackage}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Generate preview
          </button>
        </div>

        <div className="min-w-0 space-y-6 lg:col-span-3 xl:col-span-3">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <span className="text-xs font-medium text-muted-foreground">
                Preview
              </span>
            </div>
            <div
              className={`relative min-h-[200px] p-4 ${embedType === 'image' && theme === 'light' ? 'bg-foreground' : ''}`}
            >
              {embedType === 'image' ? (
                <>
                  {!imageLoaded && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                      <LoadingMessage />
                    </div>
                  )}
                  {activePackage ? (
                    <img
                      key={previewUrl}
                      src={previewUrl}
                      alt={`Dependents of ${activePackage}`}
                      className={`w-full transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                      onLoad={() => setImageLoaded(true)}
                      onError={() => setImageLoaded(true)}
                    />
                  ) : (
                    <div className="flex h-full min-h-[160px] items-center justify-center text-sm text-muted-foreground">
                      <span>
                        Enter a package name and click{' '}
                        <strong>Generate preview</strong>
                      </span>
                    </div>
                  )}
                </>
              ) : activePackage ? (
                <div className="flex min-h-[160px] items-center justify-center">
                  {!imageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                    </div>
                  )}
                  <img
                    key={badgePreviewUrl}
                    src={badgePreviewUrl}
                    alt={`Used by badge for ${activePackage}`}
                    className={`transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageLoaded(true)}
                  />
                </div>
              ) : (
                <div className="flex h-full min-h-[160px] items-center justify-center text-sm text-muted-foreground">
                  <span>
                    Enter a package name and click{' '}
                    <strong>Generate preview</strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          {activePackage && (
            <div className="flex justify-end">
              <Link
                href={`/${platform}/${activePackage}`}
                className="inline-flex items-center gap-1 text-sm text-accent transition-opacity hover:opacity-80"
              >
                View full page &rarr;
              </Link>
            </div>
          )}

          {packageName && (
            <div className="space-y-4">
              <CodeSnippetCard
                label="Markdown"
                code={activeMarkdownEmbed}
                language="markdown"
                copyText={activeMarkdownEmbed}
              />

              <CodeSnippetCard
                label="HTML"
                code={activeHtmlEmbed}
                language="html"
                copyText={activeHtmlEmbed}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const LOADING_MESSAGES = [
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
  'GitHub rate limits are keeping us honest',
  'Wrapping things up\u2026',
  'Seriously, almost there\u2026',
  'Worth the wait, I promise\u2026',
];

function LoadingMessage() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(
      () => setIndex((i) => (i + 1) % LOADING_MESSAGES.length),
      2000
    );
    return () => clearInterval(interval);
  }, []);

  return (
    <p key={index} className="animate-fade-in text-xs text-muted-foreground">
      {LOADING_MESSAGES[index]}
    </p>
  );
}
