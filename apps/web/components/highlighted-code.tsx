import { type ReactNode } from 'react';

interface HighlightedCodeProps {
  language: 'markdown' | 'html';
  children: string;
}

interface Token {
  text: string;
  className?: string;
}

function tokenizeMarkdown(code: string): Token[] {
  const tokens: Token[] = [];
  // Match URLs or markdown link/image punctuation
  const pattern = /(https?:\/\/[^\s)\]]+)|(!\[|\]\(|\)\]|\[|\])/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(code)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: code.slice(lastIndex, match.index) });
    }
    if (match[1]) {
      tokens.push({ text: match[1], className: 'text-accent-light' });
    } else if (match[2]) {
      tokens.push({ text: match[2], className: 'text-muted-foreground' });
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < code.length) {
    tokens.push({ text: code.slice(lastIndex) });
  }

  return tokens;
}

function tokenizeHtml(code: string): Token[] {
  const tokens: Token[] = [];
  // Match tags/brackets, attribute names, or quoted strings
  const pattern = /(<\/?[a-z][a-z0-9]*|\/?>|>)|((?:href|src|alt)=)|("[^"]*")/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(code)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: code.slice(lastIndex, match.index) });
    }
    if (match[1]) {
      // Tag or bracket
      tokens.push({ text: match[1], className: 'text-muted-foreground' });
    } else if (match[2]) {
      // Attribute name + equals sign (e.g. "href=")
      const attr = match[2];
      tokens.push({ text: attr.slice(0, -1) });
      tokens.push({ text: '=', className: 'text-muted-foreground' });
    } else if (match[3]) {
      // Quoted string value
      tokens.push({ text: match[3], className: 'text-accent-light' });
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < code.length) {
    tokens.push({ text: code.slice(lastIndex) });
  }

  return tokens;
}

export function HighlightedCode({ language, children }: HighlightedCodeProps) {
  const tokens =
    language === 'markdown'
      ? tokenizeMarkdown(children)
      : tokenizeHtml(children);

  const elements: ReactNode[] = [];
  let i = 0;

  for (const token of tokens) {
    if (token.className) {
      elements.push(
        <span key={i} className={token.className}>
          {token.text}
        </span>
      );
    } else {
      elements.push(token.text);
    }
    i++;
  }

  return <code>{elements}</code>;
}
