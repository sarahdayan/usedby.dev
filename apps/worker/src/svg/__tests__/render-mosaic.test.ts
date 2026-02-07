import { describe, it, expect } from 'vitest';
import { renderMosaic } from '../render-mosaic';
import type { AvatarData } from '../types';

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

  it('returns empty SVG for empty input', () => {
    const svg = renderMosaic([]);

    expect(svg).toContain('width="1"');
    expect(svg).toContain('height="1"');
    expect(svg).toContain('aria-label="No dependents"');
    expect(svg).not.toContain('<image');
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
});
