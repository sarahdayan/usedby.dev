import { describe, it, expect } from 'vitest';
import { renderThemeStyle } from '../theme';

describe('renderThemeStyle', () => {
  it('returns light styles and dark media query for auto', () => {
    const style = renderThemeStyle('auto');

    expect(style).toContain('.text-primary{fill:#1f2328}');
    expect(style).toContain('.text-secondary{fill:#656d76}');
    expect(style).toContain('@media(prefers-color-scheme:dark)');
    expect(style).toContain('.text-primary{fill:#e6edf3}');
    expect(style).toContain('.text-secondary{fill:#8b949e}');
  });

  it('returns light styles only for light', () => {
    const style = renderThemeStyle('light');

    expect(style).toContain('.text-primary{fill:#1f2328}');
    expect(style).toContain('.text-secondary{fill:#656d76}');
    expect(style).not.toContain('@media');
  });

  it('returns dark styles only for dark', () => {
    const style = renderThemeStyle('dark');

    expect(style).toContain('.text-primary{fill:#e6edf3}');
    expect(style).toContain('.text-secondary{fill:#8b949e}');
    expect(style).not.toContain('@media');
    expect(style).not.toContain('#1f2328');
  });

  it('defaults to auto when undefined', () => {
    const style = renderThemeStyle(undefined);

    expect(style).toContain('@media(prefers-color-scheme:dark)');
    expect(style).toContain('.text-primary{fill:#1f2328}');
    expect(style).toContain('.text-primary{fill:#e6edf3}');
  });
});
