import { CopyButton } from '@/components/copy-button';
import { HighlightedCode } from '@/components/highlighted-code';

interface CodeSnippetCardProps {
  label: string;
  code: string;
  language: 'markdown' | 'html';
  copyText: string;
}

export function CodeSnippetCard({
  label,
  code,
  language,
  copyText,
}: CodeSnippetCardProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <CopyButton text={copyText} />
      </div>
      <div className="overflow-x-auto p-4">
        <pre className="font-mono text-sm leading-loose text-foreground">
          <HighlightedCode language={language}>{code}</HighlightedCode>
        </pre>
      </div>
    </div>
  );
}
