import { escapeXml } from './avatar';

export function renderMessage(message: string): string {
  const escaped = escapeXml(message);
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="40" viewBox="0 0 300 40"',
    ` role="img" aria-label="${escaped}">`,
    '<text x="150" y="24" text-anchor="middle" fill="#666"',
    ' font-family="system-ui, -apple-system, sans-serif" font-size="14">',
    escaped,
    '</text>',
    '</svg>',
  ].join('');
}
