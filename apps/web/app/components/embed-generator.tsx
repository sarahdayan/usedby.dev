'use client';

import { useState, useCallback, useRef } from 'react';

const VALID_PATTERN = /^(@[a-zA-Z0-9._-]+\/)?[a-zA-Z0-9._-]+$/;
const DEFAULT_MAX = 30;
const MAX_AVATARS = 40;

export function EmbedGenerator() {
  const [input, setInput] = useState('');
  const [maxInput, setMaxInput] = useState(String(DEFAULT_MAX));
  const [style, setStyle] = useState<'mosaic' | 'detailed'>('mosaic');
  const [sort, setSort] = useState<'score' | 'stars'>('score');
  const [theme, setTheme] = useState<'auto' | 'light' | 'dark'>('auto');
  const [generated, setGenerated] = useState('');
  const [generatedMax, setGeneratedMax] = useState(DEFAULT_MAX);
  const [snippetTab, setSnippetTab] = useState<'markdown' | 'html'>('markdown');
  const [copied, setCopied] = useState(false);
  const [imageStatus, setImageStatus] = useState<
    'idle' | 'loading' | 'loaded' | 'error'
  >('idle');
  const copyTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const normalized = input.trim();
  const isValid = VALID_PATTERN.test(normalized);
  const showHint = input.length > 0 && !isValid;

  const displayPath = generated ? `npm/${generated}` : 'npm/package';
  const displayMax = generated ? generatedMax : DEFAULT_MAX;

  const params = new URLSearchParams();

  if (displayMax !== DEFAULT_MAX) {
    params.set('max', String(displayMax));
  }

  if (style !== 'mosaic') {
    params.set('style', style);
  }

  if (sort !== 'score') {
    params.set('sort', sort);
  }

  if (theme !== 'auto') {
    params.set('theme', theme);
  }

  const query = params.size > 0 ? `?${params}` : '';
  const imageUrl = `https://api.usedby.dev/${displayPath}${query}`;
  const dependentsUrl = `https://github.com/owner/repo/network/dependents`;
  const markdownSnippet = `[![Used by](${imageUrl})](${dependentsUrl})\n\n<sub>Made with [usedby.dev](https://usedby.dev/).</sub>`;
  const htmlSnippet = `<a href="${dependentsUrl}">\n  <img src="${imageUrl}" alt="Used by" />\n</a>\n\n<sub>Made with <a href="https://usedby.dev/">usedby.dev</a>.</sub>`;
  const imageKey = `${generated}-${generatedMax}-${style}-${sort}-${theme}`;

  function clampMax(value: string) {
    return Math.max(1, Math.min(MAX_AVATARS, Math.floor(Number(value)) || 1));
  }

  function resetImage() {
    return setImageStatus('loading');
  }

  const generate = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();

      if (!isValid) {
        return;
      }

      setGenerated(normalized);
      setGeneratedMax(clampMax(maxInput));
      setImageStatus('loading');
    },
    [isValid, normalized, maxInput]
  );

  const copySnippet = useCallback(async () => {
    if (!generated) {
      return;
    }

    const text = snippetTab === 'markdown' ? markdownSnippet : htmlSnippet;

    try {
      await navigator.clipboard.writeText(text);

      clearTimeout(copyTimeout.current);
      setCopied(true);

      copyTimeout.current = setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [generated, snippetTab, markdownSnippet, htmlSnippet]);

  return (
    <section className="py-10">
      <p className="text-xs font-bold uppercase tracking-widest text-fg-muted mb-6">
        Try it
      </p>
      <form onSubmit={generate} className="flex gap-3 mb-3">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="npm package name"
          aria-label="npm package name"
          className="flex-1 bg-code-bg text-code-fg font-mono text-[0.9375rem] leading-[1.6] px-7 py-6 rounded-xl outline-none placeholder:text-fg-muted focus-visible:ring-2 focus-visible:ring-fg/20 max-sm:text-[0.8125rem] max-sm:p-5"
        />
        <label className="flex items-center gap-2 bg-code-bg text-code-fg font-mono text-[0.9375rem] px-7 rounded-xl max-sm:text-[0.8125rem] max-sm:px-5">
          <span className="text-fg-muted">max</span>
          <input
            type="number"
            value={maxInput}
            onChange={(event) => setMaxInput(event.target.value)}
            onBlur={() => setMaxInput(String(clampMax(maxInput)))}
            min={1}
            max={MAX_AVATARS}
            aria-label="Maximum number of avatars (1–40)"
            className="w-12 bg-transparent outline-none text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </label>
        <button
          type="submit"
          disabled={!isValid}
          className="bg-code-bg text-code-fg font-mono text-[0.9375rem] px-7 rounded-xl cursor-pointer disabled:cursor-default disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-fg/20 max-sm:text-[0.8125rem] max-sm:px-5"
        >
          Generate
        </button>
      </form>
      <div className="flex flex-wrap gap-4 text-sm mb-2">
        <SegmentedControl
          label="Style"
          value={style}
          onChange={(value) => {
            setStyle(value);

            if (generated) {
              resetImage();
            }
          }}
          options={[
            { value: 'mosaic', label: 'Mosaic' },
            { value: 'detailed', label: 'Detailed' },
          ]}
        />
        <SegmentedControl
          label="Sort"
          value={sort}
          onChange={(value) => {
            setSort(value);

            if (generated) {
              resetImage();
            }
          }}
          options={[
            { value: 'score', label: 'Score' },
            { value: 'stars', label: 'Stars' },
          ]}
        />
        <SegmentedControl
          label="Theme"
          value={theme}
          onChange={(value) => {
            setTheme(value);

            if (generated) {
              resetImage();
            }
          }}
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
      <div className={`flex flex-col gap-5${generated ? '' : ' opacity-50'}`}>
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setSnippetTab('markdown');
                  setCopied(false);
                }}
                className={`text-sm cursor-pointer ${snippetTab === 'markdown' ? 'text-fg' : 'text-fg-muted hover:text-fg'}`}
              >
                Markdown
              </button>
              <button
                type="button"
                onClick={() => {
                  setSnippetTab('html');
                  setCopied(false);
                }}
                className={`text-sm cursor-pointer ${snippetTab === 'html' ? 'text-fg' : 'text-fg-muted hover:text-fg'}`}
              >
                HTML
              </button>
            </div>
            <button
              onClick={copySnippet}
              disabled={!generated}
              className="text-sm text-fg-muted hover:text-fg cursor-pointer disabled:cursor-default disabled:hover:text-fg-muted"
            >
              <span aria-live="polite">{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          <pre className="bg-code-bg text-code-fg font-mono text-[0.9375rem] leading-[1.6] px-7 py-6 rounded-xl overflow-x-auto max-sm:text-[0.8125rem] max-sm:p-5">
            <code>
              {snippetTab === 'markdown' ? markdownSnippet : htmlSnippet}
            </code>
          </pre>
        </div>
        <div className="mt-3">
          <p className="text-sm text-fg-muted mb-3">Preview</p>
          {generated ? (
            <>
              {imageStatus === 'loading' && (
                <div className="bg-code-bg rounded-xl h-92 animate-pulse" />
              )}
              {imageStatus === 'error' && (
                <div className="bg-code-bg rounded-xl h-92 flex items-center justify-center">
                  <p className="text-sm text-fg-muted">
                    Failed to load preview
                  </p>
                </div>
              )}
              <img
                key={imageKey}
                src={imageUrl}
                alt={`${generated} dependents mosaic`}
                onLoad={() => setImageStatus('loaded')}
                onError={() => setImageStatus('error')}
                className={imageStatus === 'loaded' ? '' : 'hidden'}
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

interface SegmentedControlProps<TValue extends string> {
  label: string;
  value: TValue;
  onChange: (value: TValue) => void;
  options: { value: TValue; label: string }[];
}

function SegmentedControl<TValue extends string>({
  label,
  value,
  onChange,
  options,
}: SegmentedControlProps<TValue>) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-fg-muted mr-1 text-sm">{label}</span>
      <div className="flex bg-fg/5 rounded-md p-0.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`px-2 py-0.5 rounded cursor-pointer transition-colors text-sm ${
              value === option.value
                ? 'bg-bg text-fg shadow-sm'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
