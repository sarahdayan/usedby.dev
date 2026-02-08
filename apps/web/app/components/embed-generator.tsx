'use client';

import { useState, useCallback, useRef } from 'react';

const VALID_PATTERN = /^(@[a-zA-Z0-9._-]+\/)?[a-zA-Z0-9._-]+$/;
const DEFAULT_MAX = 35;
const MAX_AVATARS = 35;

function SegmentedControl<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex items-center bg-code-bg rounded-xl font-mono text-[0.9375rem] px-2 py-2 max-sm:text-[0.8125rem]">
      <span className="sr-only">{label}</span>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`px-5 py-4 rounded-lg cursor-pointer transition-colors ${
            value === option.value
              ? 'bg-fg/10 text-code-fg'
              : 'text-fg-muted hover:text-code-fg'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function normalize(value: string) {
  return value.trim();
}

export function EmbedGenerator() {
  const [input, setInput] = useState('');
  const [maxInput, setMaxInput] = useState(String(DEFAULT_MAX));
  const [styleInput, setStyleInput] = useState<'mosaic' | 'detailed'>('mosaic');
  const [sortInput, setSortInput] = useState<'score' | 'stars'>('score');
  const [themeInput, setThemeInput] = useState<'auto' | 'light' | 'dark'>(
    'auto'
  );
  const [generated, setGenerated] = useState('');
  const [generatedMax, setGeneratedMax] = useState(DEFAULT_MAX);
  const [generatedStyle, setGeneratedStyle] = useState<'mosaic' | 'detailed'>(
    'mosaic'
  );
  const [generatedSort, setGeneratedSort] = useState<'score' | 'stars'>(
    'score'
  );
  const [generatedTheme, setGeneratedTheme] = useState<
    'auto' | 'light' | 'dark'
  >('auto');
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
  const displayStyle = generated ? generatedStyle : 'mosaic';
  const displaySort = generated ? generatedSort : 'score';
  const displayTheme = generated ? generatedTheme : 'auto';

  const params = new URLSearchParams();
  if (displayMax !== DEFAULT_MAX) params.set('max', String(displayMax));
  if (displayStyle !== 'mosaic') params.set('style', displayStyle);
  if (displaySort !== 'score') params.set('sort', displaySort);
  if (displayTheme !== 'auto') params.set('theme', displayTheme);
  const query = params.size > 0 ? `?${params}` : '';
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
      setGeneratedStyle(styleInput);
      setGeneratedSort(sortInput);
      setGeneratedTheme(themeInput);
      setImageLoaded(false);
      setImageError(false);
    },
    [isValid, normalized, maxInput, styleInput, sortInput, themeInput]
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
      <form onSubmit={generate} className="flex gap-3 mb-3">
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
            aria-label="Maximum number of avatars (1–35)"
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
      <div className="flex gap-3 mb-2">
        <SegmentedControl
          label="Style"
          value={styleInput}
          onChange={setStyleInput}
          options={[
            { value: 'mosaic', label: 'Mosaic' },
            { value: 'detailed', label: 'Detailed' },
          ]}
        />
        <SegmentedControl
          label="Sort"
          value={sortInput}
          onChange={setSortInput}
          options={[
            { value: 'score', label: 'Score' },
            { value: 'stars', label: 'Stars' },
          ]}
        />
        <SegmentedControl
          label="Theme"
          value={themeInput}
          onChange={setThemeInput}
          options={[
            { value: 'auto', label: 'Auto' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
      </div>
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
                key={`${generated}-${generatedMax}-${generatedStyle}-${generatedSort}-${generatedTheme}`}
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
