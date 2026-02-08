'use client';

import { useState } from 'react';
import { CheckIcon, CopyIcon } from 'lucide-react';

const markdownSnippet = `[![Dependents](https://api.usedby.dev/npm/your-package)](https://github.com/your-org/your-repo/network/dependents)`;

const htmlSnippet = `<a href="https://github.com/your-org/your-repo/network/dependents">
  <img src="https://api.usedby.dev/npm/your-package" alt="Dependents" />
</a>`;

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

export function QuickStart() {
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
          One line, that&apos;s it.
        </h2>
        <p className="mt-4 max-w-xl text-center text-lg leading-relaxed text-muted-foreground">
          Add a single line of Markdown to your README and let the world see who
          depends on your library.
        </p>

        <div className="mt-12 w-full max-w-3xl space-y-6">

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="text-xs font-medium text-muted-foreground">
                Markdown
              </span>
              <CopyButton text={markdownSnippet} />
            </div>
            <div className="overflow-x-auto p-4">
              <pre className="font-mono text-sm leading-loose text-foreground">
                <code>{markdownSnippet}</code>
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
                <code>{htmlSnippet}</code>
              </pre>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Replace{' '}
            <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-foreground">
              your-package
            </code>{' '}
            with your npm package name. Scoped packages like{' '}
            <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-foreground">
              @scope/package
            </code>{' '}
            work too.
          </p>
        </div>
      </div>
    </section>
  );
}
