'use client';

import { useState, useCallback, useRef } from 'react';

const VALID_PATTERN = /^(@[a-zA-Z0-9._-]+\/)?[a-zA-Z0-9._-]+$/;
const DEFAULT_MAX = 35;
const MAX_AVATARS = 100;

function normalize(value: string) {
  return value.trim();
}

export function EmbedGenerator() {
  const [input, setInput] = useState('');
  const [maxInput, setMaxInput] = useState(String(DEFAULT_MAX));
  const [generated, setGenerated] = useState('');
  const [generatedMax, setGeneratedMax] = useState(DEFAULT_MAX);
  const [markdownCopied, setMarkdownCopied] = useState(false);
  const [htmlCopied, setHtmlCopied] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const markdownTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const htmlTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const normalized = normalize(input);
  const isValid = VALID_PATTERN.test(normalized);
  const showHint = input.length > 0 && !isValid;
  const displayPath = generated ? `npm/${generated}` : 'npm/package';
  const displayMax = generated ? generatedMax : DEFAULT_MAX;
  const query = displayMax !== DEFAULT_MAX ? `?max=${displayMax}` : '';
  const imageUrl = `https://api.usedby.dev/${displayPath}${query}`;
  const markdownSnippet = `![Used by](${imageUrl})`;
  const htmlSnippet = `<img src="${imageUrl}" alt="Used by" />`;

  const clampMax = (value: string) =>
    Math.max(1, Math.min(MAX_AVATARS, Math.floor(Number(value)) || 1));

  const generate = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!isValid) return;
      setGenerated(normalized);
      setGeneratedMax(clampMax(maxInput));
      setImageLoaded(false);
      setImageError(false);
    },
    [isValid, normalized, maxInput]
  );

  const copyMarkdown = useCallback(async () => {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(markdownSnippet);
      clearTimeout(markdownTimeout.current);
      setMarkdownCopied(true);
      markdownTimeout.current = setTimeout(
        () => setMarkdownCopied(false),
        2000
      );
    } catch {
      /* clipboard unavailable */
    }
  }, [generated, markdownSnippet]);

  const copyHtml = useCallback(async () => {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(htmlSnippet);
      clearTimeout(htmlTimeout.current);
      setHtmlCopied(true);
      htmlTimeout.current = setTimeout(() => setHtmlCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }, [generated, htmlSnippet]);

  return (
    <section className="py-section border-t border-border max-sm:py-20">
      <p className="text-xs font-bold uppercase tracking-widest text-fg-muted mb-6">
        Try it
      </p>
      <form onSubmit={generate} className="flex gap-3 mb-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="react"
          aria-label="npm package name"
          className="flex-1 bg-code-bg text-code-fg font-mono text-[0.9375rem] leading-[1.6] px-7 py-6 rounded-xl outline-none placeholder:text-fg-muted max-sm:text-[0.8125rem] max-sm:p-5"
        />
        <label className="flex items-center gap-2 bg-code-bg text-code-fg font-mono text-[0.9375rem] px-7 rounded-xl max-sm:text-[0.8125rem] max-sm:px-5">
          <span className="text-fg-muted">max</span>
          <input
            type="number"
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
            onBlur={() => setMaxInput(String(clampMax(maxInput)))}
            min={1}
            max={MAX_AVATARS}
            aria-label="Maximum number of avatars (1–100)"
            className="w-12 bg-transparent outline-none text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </label>
        <button
          type="submit"
          disabled={!isValid}
          className="bg-code-bg text-code-fg font-mono text-[0.9375rem] px-7 rounded-xl cursor-pointer disabled:cursor-default disabled:opacity-50 max-sm:text-[0.8125rem] max-sm:px-5"
        >
          Generate
        </button>
      </form>
      <p
        className={`text-sm text-fg-muted mb-3 ${showHint ? 'visible' : 'invisible'}`}
      >
        Enter a valid npm package name
      </p>
      <div
        className={`flex flex-col gap-5${generated ? '' : ' opacity-50'}`}
        aria-hidden={!generated}
      >
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-fg-muted">Markdown</p>
            <button
              onClick={copyMarkdown}
              disabled={!generated}
              className="text-sm text-fg-muted hover:text-fg cursor-pointer disabled:cursor-default disabled:hover:text-fg-muted"
            >
              <span aria-live="polite">
                {markdownCopied ? 'Copied!' : 'Copy'}
              </span>
            </button>
          </div>
          <pre className="bg-code-bg text-code-fg font-mono text-[0.9375rem] leading-[1.6] px-7 py-6 rounded-xl overflow-x-auto max-sm:text-[0.8125rem] max-sm:p-5">
            <code>{markdownSnippet}</code>
          </pre>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-fg-muted">HTML</p>
            <button
              onClick={copyHtml}
              disabled={!generated}
              className="text-sm text-fg-muted hover:text-fg cursor-pointer disabled:cursor-default disabled:hover:text-fg-muted"
            >
              <span aria-live="polite">{htmlCopied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          <pre className="bg-code-bg text-code-fg font-mono text-[0.9375rem] leading-[1.6] px-7 py-6 rounded-xl overflow-x-auto max-sm:text-[0.8125rem] max-sm:p-5">
            <code>{htmlSnippet}</code>
          </pre>
        </div>
        <div className="mt-3">
          <p className="text-sm text-fg-muted mb-3">Preview</p>
          {generated ? (
            <>
              {!imageLoaded && !imageError && (
                <div className="bg-code-bg rounded-xl h-92 flex items-center justify-center">
                  <p className="text-sm text-fg-muted">Loading...</p>
                </div>
              )}
              {imageError && (
                <div className="bg-code-bg rounded-xl h-92 flex items-center justify-center">
                  <p className="text-sm text-fg-muted">
                    Failed to load preview
                  </p>
                </div>
              )}
              <img
                key={`${generated}-${generatedMax}`}
                src={imageUrl}
                alt={`${generated} dependents mosaic`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                className={imageLoaded ? '' : 'hidden'}
              />
            </>
          ) : (
            <div className="bg-code-bg rounded-xl h-92" />
          )}
        </div>
      </div>
    </section>
  );
}
