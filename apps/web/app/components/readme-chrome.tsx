export function ReadmeChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-chrome-border rounded-md overflow-hidden text-left">
      <div className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-chrome-header border-b border-chrome-border text-chrome-fg">
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z" />
        </svg>
        README.md
      </div>
      <div className="p-8 text-base leading-relaxed max-sm:p-5">
        <h1 className="text-4xl font-semibold pb-2 mb-4 border-b border-chrome-border">
          usedby.dev
        </h1>
        <p className="mb-4 text-fg-muted text-xl">
          Showcase who depends on your npm package.
        </p>
        <h4 className="text-base font-semibold mt-6 mb-4">Used by</h4>
        {children}
      </div>
    </div>
  );
}
