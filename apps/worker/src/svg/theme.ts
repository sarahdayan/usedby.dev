export type Theme = 'light' | 'dark' | 'auto';

const LIGHT = { primary: '#1f2328', secondary: '#656d76' };
const DARK = { primary: '#e6edf3', secondary: '#8b949e' };

export function renderThemeStyle(theme: Theme | undefined): string {
  const resolved = theme ?? 'auto';

  if (resolved === 'light') {
    return `<style>.text-primary{fill:${LIGHT.primary}}.text-secondary{fill:${LIGHT.secondary}}</style>`;
  }

  if (resolved === 'dark') {
    return `<style>.text-primary{fill:${DARK.primary}}.text-secondary{fill:${DARK.secondary}}</style>`;
  }

  return [
    '<style>',
    `.text-primary{fill:${LIGHT.primary}}`,
    `.text-secondary{fill:${LIGHT.secondary}}`,
    `@media(prefers-color-scheme:dark){`,
    `.text-primary{fill:${DARK.primary}}`,
    `.text-secondary{fill:${DARK.secondary}}`,
    '}',
    '</style>',
  ].join('');
}
