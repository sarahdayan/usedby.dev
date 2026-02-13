'use client';

import { useState } from 'react';
import { CheckIcon, CopyIcon } from 'lucide-react';

interface CopyButtonProps {
  text: string;
}

export function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. non-HTTPS, permission denied)
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <>
          <CheckIcon className="h-3.5 w-3.5 text-accent" />
          Copied
        </>
      ) : (
        <>
          <CopyIcon className="h-3.5 w-3.5" />
          Copy
        </>
      )}
    </button>
  );
}
