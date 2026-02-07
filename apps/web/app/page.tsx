const examples = [
  { owner: 'facebook', repo: 'react', file: 'facebook-react.svg' },
  { owner: 'vercel', repo: 'next.js', file: 'vercel-next.js.svg' },
  {
    owner: 'tailwindlabs',
    repo: 'tailwindcss',
    file: 'tailwindlabs-tailwindcss.svg',
  },
];

export default function Home() {
  return (
    <div className="max-w-page mx-auto px-6 font-sans">
      {/* Hero */}
      <section className="pt-[140px] pb-section text-center max-sm:pt-20 max-sm:pb-20">
        <h1 className="text-[3.5rem] font-bold tracking-[-0.03em] leading-[1.1] mb-4 max-sm:text-[2.5rem]">
          usedby.dev
        </h1>
        <p className="text-[1.25rem] text-fg-muted mb-12 max-sm:text-[1.0625rem] max-sm:mb-8">
          Showcase who depends on your open-source library.
        </p>
        <img
          className="mx-auto"
          src="/examples/facebook-react.svg"
          alt="facebook/react dependents mosaic"
          width={520}
          height={368}
        />
      </section>

      {/* How it works */}
      <section className="py-section border-t border-border max-sm:py-20">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-fg-muted mb-6">
          How it works
        </p>
        <pre className="bg-code-bg text-code-fg font-mono text-[0.9375rem] leading-[1.6] px-7 py-6 rounded-xl overflow-x-auto mb-5 max-sm:text-[0.8125rem] max-sm:p-5">
          <code>
            {'<img src="'}
            <span className="text-code-url">
              https://usedby.dev/facebook/react
            </span>
            {'" alt="Dependents" />'}
          </code>
        </pre>
        <p className="text-fg-muted text-[1.0625rem] leading-[1.6]">
          No API keys, no build step, no configuration.
        </p>
      </section>

      {/* Examples */}
      <section className="py-section border-t border-border max-sm:py-20">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-fg-muted mb-6">
          Examples
        </p>
        <div className="flex flex-col gap-16 max-sm:gap-12">
          {examples.map((example) => (
            <div key={example.file} className="flex flex-col gap-3">
              <p className="font-mono text-sm text-fg-muted">
                {example.owner}/{example.repo}
              </p>
              <img
                src={`/examples/${example.file}`}
                alt={`${example.owner}/${example.repo} dependents mosaic`}
                width={520}
                height={368}
              />
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-section border-t border-border text-center max-sm:py-20">
        <h2 className="text-[2rem] font-bold tracking-[-0.03em] leading-[1.2] mb-4 max-sm:text-[1.5rem]">
          Try it with your library
        </h2>
        <p className="font-mono text-[1.0625rem] text-fg-muted">
          https://usedby.dev/:owner/:repo
        </p>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border text-center">
        <a
          className="text-sm text-fg-muted hover:text-fg"
          href="https://github.com/sarahdayan/usedby.dev"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
      </footer>
    </div>
  );
}
