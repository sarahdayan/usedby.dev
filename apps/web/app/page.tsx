import { EmbedGenerator, HeroMosaic, ReadmeChrome } from './components';

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto px-6 font-sans">
      <section className="py-30 text-center">
        <ReadmeChrome>
          <HeroMosaic />
        </ReadmeChrome>
      </section>

      <section className="py-10">
        <p className="text-xs font-bold uppercase tracking-widest text-fg-muted mb-6">
          How it works
        </p>
        <pre className="bg-code-bg text-code-fg font-mono text-[0.9375rem] leading-8 px-7 py-6 rounded-xl overflow-x-auto mb-5 max-sm:text-[0.8125rem] max-sm:p-5">
          <code>
            <span className="code-tag">{'<a'}</span>{' '}
            <span className="code-attr">href</span>
            {'='}
            <span className="code-string">
              {'"https://github.com/facebook/react/network/dependents"'}
            </span>
            <span className="code-tag">{'>'}</span>
            {'\n  '}
            <span className="code-tag">{'<img'}</span>{' '}
            <span className="code-attr">src</span>
            {'='}
            <span className="code-string">
              {'"https://api.usedby.dev/npm/react"'}
            </span>{' '}
            <span className="code-attr">alt</span>
            {'='}
            <span className="code-string">{'"Used by"'}</span>{' '}
            <span className="code-tag">{'/>'}</span>
            {'\n'}
            <span className="code-tag">{'</a>'}</span>
          </code>
        </pre>
        <p className="text-fg-muted text-[1.0625rem] leading-[1.6]">
          No API keys, no build step, no configuration.
        </p>
      </section>

      <EmbedGenerator />

      <footer className="py-12 text-center text-sm text-fg-muted flex flex-col gap-1">
        <p>
          By{' '}
          <a
            className="hover:text-fg"
            href="https://www.sarahdayan.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Sarah Dayan
          </a>{' '}
          &middot; MIT License &middot;{' '}
          <a
            className="hover:text-fg"
            href="https://github.com/sarahdayan/usedby.dev"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}
