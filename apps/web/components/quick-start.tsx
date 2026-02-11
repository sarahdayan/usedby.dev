'use client';

import { type ReactNode, useMemo, useState } from 'react';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { HighlightedCode } from '@/components/highlighted-code';
import { ECOSYSTEMS } from '@/lib/ecosystems';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <>
          <CheckIcon className="h-3.5 w-3.5 text-accent" />
          <span className="text-accent">Copied</span>
        </>
      ) : (
        <>
          <CopyIcon className="h-3.5 w-3.5" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

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

export function QuickStart() {
  const [platform, setPlatform] = useState('npm');

  const markdownSnippet = useMemo(
    () =>
      `[![Used by](https://api.usedby.dev/${platform}/your-package)](https://github.com/your-org/your-repo/network/dependents)\nGenerated with [usedby.dev](https://usedby.dev/)`,
    [platform]
  );

  const htmlSnippet = useMemo(
    () =>
      `<a href="https://github.com/your-org/your-repo/network/dependents">\n  <img src="https://api.usedby.dev/${platform}/your-package" alt="Used by" />\n</a>\nGenerated with <a href="https://usedby.dev/">usedby.dev</a>`,
    [platform]
  );

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
          <div className="flex justify-center">
            <ToggleGroup
              options={ECOSYSTEMS.map((e) => ({
                label: e.label,
                value: e.id,
              }))}
              value={platform}
              onChange={setPlatform}
            />
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="text-xs font-medium text-muted-foreground">
                Markdown
              </span>
              <CopyButton text={markdownSnippet} />
            </div>
            <div className="overflow-x-auto p-4">
              <pre className="font-mono text-sm leading-loose text-foreground">
                <HighlightedCode language="markdown">
                  {markdownSnippet}
                </HighlightedCode>
              </pre>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="text-xs font-medium text-muted-foreground">
                HTML
              </span>
              <CopyButton text={htmlSnippet} />
            </div>
            <div className="overflow-x-auto p-4">
              <pre className="font-mono text-sm leading-loose text-foreground">
                <HighlightedCode language="html">{htmlSnippet}</HighlightedCode>
              </pre>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            {HINTS[platform]}
          </p>
        </div>
      </div>
    </section>
  );
}

interface ToggleGroupProps<T extends string> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
}: ToggleGroupProps<T>) {
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
