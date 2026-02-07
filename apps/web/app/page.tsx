import styles from "./page.module.css";

const examples = [
  { owner: "facebook", repo: "react", file: "facebook-react.svg" },
  { owner: "vercel", repo: "next.js", file: "vercel-next.js.svg" },
  {
    owner: "tailwindlabs",
    repo: "tailwindcss",
    file: "tailwindlabs-tailwindcss.svg",
  },
];

export default function Home() {
  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>UsedBy.dev</h1>
        <p className={styles.heroTagline}>
          Showcase who depends on your open-source library.
        </p>
        <img
          className={styles.heroMosaic}
          src="/examples/facebook-react.svg"
          alt="facebook/react dependents mosaic"
          width={520}
          height={368}
        />
      </section>

      {/* How it works */}
      <section className={styles.howItWorks}>
        <p className={styles.sectionLabel}>How it works</p>
        <pre className={styles.codeBlock}>
          <code>
            {'<img src="'}
            <span className={styles.codeUrl}>
              https://usedby.dev/facebook/react
            </span>
            {'" alt="Dependents" />'}
          </code>
        </pre>
        <p className={styles.howItWorksDescription}>
          No API keys, no build step, no configuration.
        </p>
      </section>

      {/* Examples */}
      <section className={styles.examples}>
        <p className={styles.sectionLabel}>Examples</p>
        <div className={styles.exampleGrid}>
          {examples.map((example) => (
            <div key={example.file} className={styles.exampleItem}>
              <p className={styles.exampleLabel}>
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
      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>Try it with your library</h2>
        <p className={styles.ctaUrl}>
          https://usedby.dev/:owner/:repo
        </p>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <a
          className={styles.footerLink}
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
