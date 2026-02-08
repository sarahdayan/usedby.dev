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

  it('defaults to 35 avatars', () => {
    const svg = renderMosaic(createAvatars(50));
    const imageCount = (svg.match(/<image /g) ?? []).length;

    expect(imageCount).toBe(35);
  });

  it('respects a custom max', () => {
    const svg = renderMosaic(createAvatars(50), { max: 10 });
    const imageCount = (svg.match(/<image /g) ?? []).length;

    expect(imageCount).toBe(10);
  });

  it('caps max at 100', () => {
    const svg = renderMosaic(createAvatars(150), { max: 150 });
    const imageCount = (svg.match(/<image /g) ?? []).length;

    expect(imageCount).toBe(100);
  });

  it('falls back to default for max=0', () => {
    const svg = renderMosaic(createAvatars(50), { max: 0 });
    const imageCount = (svg.match(/<image /g) ?? []).length;

    expect(imageCount).toBe(35);
  });

  it('falls back to default for negative max', () => {
    const svg = renderMosaic(createAvatars(50), { max: -5 });
    const imageCount = (svg.match(/<image /g) ?? []).length;

    expect(imageCount).toBe(35);
  });

  it('falls back to default for NaN', () => {
    const svg = renderMosaic(createAvatars(50), { max: NaN });
    const imageCount = (svg.match(/<image /g) ?? []).length;

    expect(imageCount).toBe(35);
  });

  it('falls back to default for Infinity', () => {
    const svg = renderMosaic(createAvatars(50), { max: Infinity });
    const imageCount = (svg.match(/<image /g) ?? []).length;

    expect(imageCount).toBe(35);
  });

  it('floors floating-point max values', () => {
    const svg = renderMosaic(createAvatars(50), { max: 10.7 });
    const imageCount = (svg.match(/<image /g) ?? []).length;

    expect(imageCount).toBe(10);
  });

  it('renders exactly one avatar with max=1', () => {
    const svg = renderMosaic(createAvatars(10), { max: 1 });
    const imageCount = (svg.match(/<image /g) ?? []).length;

    expect(imageCount).toBe(1);
    expect(svg).toContain('width="64"');
    expect(svg).toContain('height="64"');
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

    expect(svg).toContain('width="520"');
    expect(svg).toContain('height="368"');
    expect(svg).toContain('viewBox="0 0 520 368"');
  });

  it('renders a single avatar with correct dimensions', () => {
    const svg = renderMosaic(createAvatars(1));
    const imageCount = (svg.match(/<image /g) ?? []).length;

    expect(imageCount).toBe(1);
    expect(svg).toContain('width="64"');
    expect(svg).toContain('height="64"');
    expect(svg).toContain('viewBox="0 0 64 64"');
  });

  it('computes correct dimensions for 100 avatars', () => {
    const svg = renderMosaic(createAvatars(100), { max: 100 });
    const imageCount = (svg.match(/<image /g) ?? []).length;

    expect(imageCount).toBe(100);
    // 100 avatars: 7 cols, ceil(100/7) = 15 rows
    // width = 7*64 + 6*12 = 520
    // height = 15*64 + 14*12 = 960 + 168 = 1128
    expect(svg).toContain('width="520"');
    expect(svg).toContain('height="1128"');
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

  it('still applies max before delegating to detailed', () => {
    renderMosaic(createAvatars(20), { style: 'detailed', max: 10 });

    const call = vi.mocked(renderDetailed).mock.calls[0]!;
    expect(call[0]).toHaveLength(10);
    expect(call[0]![0]).toEqual(
      expect.objectContaining({ fullName: 'org/repo-0' })
    );
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
