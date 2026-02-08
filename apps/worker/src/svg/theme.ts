export type Theme = 'light' | 'dark' | 'auto';

const LIGHT = { primary: '#1f2328', secondary: '#656d76', badgeBg: '#f0f2f5' };
const DARK = { primary: '#e6edf3', secondary: '#8b949e', badgeBg: '#272b33' };

export function renderThemeStyle(theme: Theme | undefined): string {
  const resolved = theme ?? 'auto';

  if (resolved === 'light') {
    return `<style>.text-primary{fill:${LIGHT.primary}}.text-secondary{fill:${LIGHT.secondary}}.avatar-border{stroke:transparent;stroke-width:2}.badge-bg{fill:${LIGHT.badgeBg}}</style>`;
  }

  if (resolved === 'dark') {
    return `<style>.text-primary{fill:${DARK.primary}}.text-secondary{fill:${DARK.secondary}}.avatar-border{stroke:rgba(255,255,255,0.4);stroke-width:2}.badge-bg{fill:${DARK.badgeBg}}</style>`;
  }

  return [
    '<style>',
    `.text-primary{fill:${LIGHT.primary}}`,
    `.text-secondary{fill:${LIGHT.secondary}}`,
    '.avatar-border{stroke:transparent;stroke-width:2}',
    `.badge-bg{fill:${LIGHT.badgeBg}}`,
    `@media(prefers-color-scheme:dark){`,
    `.text-primary{fill:${DARK.primary}}`,
    `.text-secondary{fill:${DARK.secondary}}`,
    '.avatar-border{stroke:rgba(255,255,255,0.4);stroke-width:2}',
    `.badge-bg{fill:${DARK.badgeBg}}`,
    '}',
    '</style>',
  ].join('');
}
