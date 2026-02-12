import { CodeSnippetCard } from '@/components/code-snippet-card';

interface EmbedSnippetsProps {
  platform: string;
  packageName: string;
}

export function EmbedSnippets({ platform, packageName }: EmbedSnippetsProps) {
  const imageUrl = `https://api.usedby.dev/${platform}/${packageName}`;
  const shieldUrl = `https://img.shields.io/endpoint?url=https://api.usedby.dev/${platform}/${packageName}/shield.json`;

  const markdownImage = `![Used by](${imageUrl})`;
  const htmlImage = `<img src="${imageUrl}" alt="Used by" />`;
  const shieldsBadge = `![Used by](${shieldUrl})`;

  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <h2 className="text-xl font-semibold text-foreground">Embed</h2>
      <p className="mt-2 text-muted-foreground">
        Copy a snippet to add to your README or docs.
      </p>

      <div className="mt-6 space-y-4">
        <CodeSnippetCard
          label="Markdown image"
          code={markdownImage}
          language="markdown"
          copyText={markdownImage}
        />
        <CodeSnippetCard
          label="HTML image"
          code={htmlImage}
          language="html"
          copyText={htmlImage}
        />
        <CodeSnippetCard
          label="Shields.io badge"
          code={shieldsBadge}
          language="markdown"
          copyText={shieldsBadge}
        />
      </div>
    </section>
  );
}
