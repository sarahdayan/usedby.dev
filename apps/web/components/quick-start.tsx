'use client';

import { type ReactNode, useMemo, useState } from 'react';
import { CodeSnippetCard } from '@/components/code-snippet-card';
import { ToggleGroup } from '@/components/toggle-group';
import { ECOSYSTEMS } from '@/lib/ecosystems';

const code = 'rounded bg-secondary px-1.5 py-0.5 font-mono text-foreground';

const HINTS: Record<string, ReactNode> = {
  npm: (
    <>
      Replace <code className={code}>your-package</code> with your npm package
      name. Scoped packages like <code className={code}>@scope/package</code>{' '}
      work too.
    </>
  ),
  rubygems: (
    <>
      Replace <code className={code}>your-package</code> with your RubyGems gem
      name.
    </>
  ),
  pypi: (
    <>
      Replace <code className={code}>your-package</code> with your PyPI package
      name.
    </>
  ),
  cargo: (
    <>
      Replace <code className={code}>your-package</code> with your Cargo crate
      name.
    </>
  ),
  composer: (
    <>
      Replace <code className={code}>your-package</code> with your Composer
      package name (e.g. <code className={code}>vendor/package</code>).
    </>
  ),
  go: (
    <>
      Replace <code className={code}>your-package</code> with your Go module
      path in <code className={code}>owner/repo</code> format (e.g.{' '}
      <code className={code}>gin-gonic/gin</code>).
    </>
  ),
};

type EmbedType = 'image' | 'badge';

export function QuickStart() {
  const [platform, setPlatform] = useState('npm');
  const [embedType, setEmbedType] = useState<EmbedType>('image');

  const imageMarkdown = useMemo(
    () =>
      `[![Used by](https://api.usedby.dev/${platform}/your-package)](https://github.com/your-org/your-repo/network/dependents)\nGenerated with [usedby.dev](https://usedby.dev/)`,
    [platform]
  );

  const imageHtml = useMemo(
    () =>
      `<a href="https://github.com/your-org/your-repo/network/dependents">\n  <img src="https://api.usedby.dev/${platform}/your-package" alt="Used by" />\n</a>\nGenerated with <a href="https://usedby.dev/">usedby.dev</a>`,
    [platform]
  );

  const badgeMarkdown = useMemo(
    () =>
      `![Used by](https://img.shields.io/endpoint?url=https://api.usedby.dev/${platform}/your-package/shield.json)`,
    [platform]
  );

  const badgeHtml = useMemo(
    () =>
      `<img src="https://img.shields.io/endpoint?url=https://api.usedby.dev/${platform}/your-package/shield.json" alt="Used by" />`,
    [platform]
  );

  const activeMarkdown = embedType === 'image' ? imageMarkdown : badgeMarkdown;
  const activeHtml = embedType === 'image' ? imageHtml : badgeHtml;

  return (
    <section
      id="quickstart"
      className="relative mx-auto max-w-5xl px-6 py-24 lg:py-32"
    >
      <div className="flex flex-col items-center">
        <p className="text-sm font-medium uppercase tracking-widest text-accent">
          Quick start
        </p>
        <h2 className="mt-4 text-balance text-center text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Copy, paste, done.
        </h2>
        <p className="mt-4 max-w-3xl text-center text-lg leading-relaxed text-muted-foreground">
          Add a snippet to your README and let the world see who depends on your
          library.
        </p>

        <div className="mt-12 w-full max-w-3xl space-y-6">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <ToggleGroup
              options={ECOSYSTEMS.map((e) => ({
                label: e.label,
                value: e.id,
              }))}
              value={platform}
              onChange={setPlatform}
            />
            <ToggleGroup
              options={[
                { label: 'Image', value: 'image' as EmbedType },
                { label: 'Badge', value: 'badge' as EmbedType },
              ]}
              value={embedType}
              onChange={setEmbedType}
            />
          </div>

          <CodeSnippetCard
            label="Markdown"
            code={activeMarkdown}
            language="markdown"
            copyText={activeMarkdown}
          />

          <CodeSnippetCard
            label="HTML"
            code={activeHtml}
            language="html"
            copyText={activeHtml}
          />

          <p className="text-center text-sm text-muted-foreground">
            {HINTS[platform]}
          </p>
        </div>
      </div>
    </section>
  );
}
