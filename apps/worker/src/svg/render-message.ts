import { escapeXml } from './avatar';
import type { Theme } from './theme';
import { renderThemeStyle } from './theme';

export function renderMessage(message: string, theme?: Theme): string {
  const escaped = escapeXml(message);
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="40" viewBox="0 0 300 40"',
    ` role="img" aria-label="${escaped}">`,
    renderThemeStyle(theme),
    '<text x="150" y="24" text-anchor="middle" class="text-secondary"',
    ' font-family="system-ui, -apple-system, sans-serif" font-size="14">',
    escaped,
    '</text>',
    '</svg>',
  ].join('');
}
