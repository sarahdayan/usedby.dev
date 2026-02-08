import { afterEach, describe, it, expect, vi } from 'vitest';
import { renderMosaic } from '../render-mosaic';
import type { AvatarData } from '../types';

vi.mock('../render-detailed', () => ({
  renderDetailed: vi.fn(() => '<svg>detailed</svg>'),
}));

vi.mock('../render-message', () => ({
  renderMessage: vi.fn(() => '<svg>message</svg>'),
}));

import { renderDetailed } from '../render-detailed';
import { renderMessage } from '../render-message';

afterEach(() => {
  vi.clearAllMocks();
});

function createAvatars(count: number): AvatarData[] {
  return Array.from({ length: count }, (_, i) => ({
    dataUri: `data:image/png;base64,img${i}`,
    fullName: `org/repo-${i}`,
  }));
}

describe('renderMosaic', () => {
  it('produces valid SVG structure', () => {
    const svg = renderMosaic(createAvatars(5));

    expect(svg).toMatch(/^<svg /);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('viewBox=');
    expect(svg).toContain('width=');
    expect(svg).toContain('height=');
    expect(svg).toContain('role="img"');
    expect(svg).toContain('aria-label="Dependents"');
    expect(svg).toContain('<defs>');
    expect(svg).toMatch(/<\/svg>$/);
  });

  it('renders all avatars passed in', () => {
    const svg = renderMosaic(createAvatars(50));
    const imageCount = (svg.match(/<image /g) ?? []).length;

    expect(imageCount).toBe(50);
  });

  it('returns message SVG for empty input', () => {
    const svg = renderMosaic([]);

    expect(renderMessage).toHaveBeenCalledWith(
      'No dependents found',
      undefined
    );
    expect(svg).toBe('<svg>message</svg>');
  });

  it('renders the correct number of images', () => {
    const svg = renderMosaic(createAvatars(12));
    const imageCount = (svg.match(/<image /g) ?? []).length;

    expect(imageCount).toBe(12);
  });

  it('preserves input order', () => {
    const avatars: AvatarData[] = [
      { dataUri: 'data:image/png;base64,first', fullName: 'org/first' },
      { dataUri: 'data:image/png;base64,second', fullName: 'org/second' },
      { dataUri: 'data:image/png;base64,third', fullName: 'org/third' },
    ];

    const svg = renderMosaic(avatars);

    const firstIdx = svg.indexOf('org/first');
    const secondIdx = svg.indexOf('org/second');
    const thirdIdx = svg.indexOf('org/third');

    expect(firstIdx).toBeLessThan(secondIdx);
    expect(secondIdx).toBeLessThan(thirdIdx);
  });

  it('sets correct dimensions for the SVG', () => {
    const svg = renderMosaic(createAvatars(35));

    // 10 cols × 70 + 9 × 12 = 808, ceil(35/10) = 4 rows: 4 × 70 + 3 × 12 = 316
    expect(svg).toContain('width="808"');
    expect(svg).toContain('height="316"');
    expect(svg).toContain('viewBox="0 0 808 316"');
  });

  it('renders a single avatar with correct dimensions', () => {
    const svg = renderMosaic(createAvatars(1));
    const imageCount = (svg.match(/<image /g) ?? []).length;

    expect(imageCount).toBe(1);
    expect(svg).toContain('width="70"');
    expect(svg).toContain('height="70"');
    expect(svg).toContain('viewBox="0 0 70 70"');
  });

  it('computes correct dimensions for 100 avatars', () => {
    const svg = renderMosaic(createAvatars(100));
    const imageCount = (svg.match(/<image /g) ?? []).length;

    expect(imageCount).toBe(100);
    // 100 avatars: 10 cols, ceil(100/10) = 10 rows
    // width = 10*70 + 9*12 = 808
    // height = 10*70 + 9*12 = 808
    expect(svg).toContain('width="808"');
    expect(svg).toContain('height="808"');
  });

  it('delegates to renderDetailed when style is detailed', () => {
    const avatars = createAvatars(5);
    const svg = renderMosaic(avatars, { style: 'detailed' });

    expect(renderDetailed).toHaveBeenCalledWith(avatars, undefined);
    expect(svg).toBe('<svg>detailed</svg>');
  });

  it('uses default mosaic renderer when style is mosaic', () => {
    const svg = renderMosaic(createAvatars(5), { style: 'mosaic' });

    expect(renderDetailed).not.toHaveBeenCalled();
    expect(svg).toContain('<image ');
  });

  it('uses default mosaic renderer when style is absent', () => {
    const svg = renderMosaic(createAvatars(5));

    expect(renderDetailed).not.toHaveBeenCalled();
    expect(svg).toContain('<image ');
  });

  it('returns message for empty input even with detailed style', () => {
    renderMosaic([], { style: 'detailed' });

    expect(renderMessage).toHaveBeenCalledWith(
      'No dependents found',
      undefined
    );
    expect(renderDetailed).not.toHaveBeenCalled();
  });

  it('passes theme to renderDetailed', () => {
    const avatars = createAvatars(5);
    renderMosaic(avatars, { style: 'detailed', theme: 'dark' });

    expect(renderDetailed).toHaveBeenCalledWith(avatars, 'dark');
  });

  it('passes theme to renderMessage for empty input', () => {
    renderMosaic([], { theme: 'dark' });

    expect(renderMessage).toHaveBeenCalledWith('No dependents found', 'dark');
  });
});
