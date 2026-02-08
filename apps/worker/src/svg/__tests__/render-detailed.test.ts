import { describe, it, expect } from 'vitest';
import { formatStars, truncateName, renderDetailed } from '../render-detailed';
import type { AvatarData } from '../types';

function createAvatars(count: number): AvatarData[] {
  return Array.from({ length: count }, (_, i) => ({
    dataUri: `data:image/png;base64,img${i}`,
    fullName: `org/repo-${i}`,
    stars: (i + 1) * 100,
  }));
}

describe('formatStars', () => {
  it('returns the number as-is below 1000', () => {
    expect(formatStars(0)).toBe('0');
    expect(formatStars(1)).toBe('1');
    expect(formatStars(999)).toBe('999');
  });

  it('formats thousands with one decimal', () => {
    expect(formatStars(1234)).toBe('1.2k');
    expect(formatStars(5678)).toBe('5.7k');
  });

  it('drops .0 for exact thousands', () => {
    expect(formatStars(1000)).toBe('1k');
    expect(formatStars(2000)).toBe('2k');
    expect(formatStars(10000)).toBe('10k');
  });

  it('formats large numbers without decimal', () => {
    expect(formatStars(100000)).toBe('100k');
    expect(formatStars(234567)).toBe('234k');
  });

  it('formats 12345 as 12.3k', () => {
    expect(formatStars(12345)).toBe('12.3k');
  });

  it('formats 99999 as 100k', () => {
    expect(formatStars(99999)).toBe('100k');
  });
});

describe('truncateName', () => {
  it('returns short names unchanged', () => {
    expect(truncateName('org/repo')).toBe('org/repo');
  });

  it('returns names at exactly the limit unchanged', () => {
    // 20 characters
    expect(truncateName('org/repo-name-exactl')).toBe('org/repo-name-exactl');
  });

  it('truncates names over the limit with ellipsis', () => {
    // 21 characters → truncated to 19 + …
    expect(truncateName('org/repo-name-exactly')).toBe('org/repo-name-exact…');
  });

  it('truncates long names', () => {
    expect(truncateName('some-long-org/very-long-repo-name')).toBe(
      'some-long-org/very-…'
    );
  });
});

describe('renderDetailed', () => {
  it('returns empty string for empty input', () => {
    expect(renderDetailed([])).toBe('');
  });

  it('produces valid SVG structure', () => {
    const svg = renderDetailed(createAvatars(3));

    expect(svg).toMatch(/^<svg /);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('viewBox=');
    expect(svg).toContain('role="img"');
    expect(svg).toContain('aria-label="Dependents"');
    expect(svg).toContain('<defs>');
    expect(svg).toMatch(/<\/svg>$/);
  });

  it('renders 4-column layout', () => {
    const svg = renderDetailed(createAvatars(4));

    // 4 cards × 200px + 3 × 16px gap = 848
    expect(svg).toContain('width="848"');
    // 1 row × 48px = 48
    expect(svg).toContain('height="48"');
  });

  it('computes correct dimensions for multiple rows', () => {
    const svg = renderDetailed(createAvatars(9));

    // 4 columns × 200 + 3 × 16 = 848
    expect(svg).toContain('width="848"');
    // ceil(9/4) = 3 rows: 3 × 48 + 2 × 12 = 168
    expect(svg).toContain('height="168"');
  });

  it('uses fewer columns when fewer avatars', () => {
    const svg = renderDetailed(createAvatars(2));

    // 2 columns × 200 + 1 × 16 = 416
    expect(svg).toContain('width="416"');
  });

  it('renders one image per avatar', () => {
    const svg = renderDetailed(createAvatars(5));
    const imageCount = (svg.match(/<image /g) ?? []).length;

    expect(imageCount).toBe(5);
  });

  it('includes GitHub links for each avatar', () => {
    const svg = renderDetailed(createAvatars(2));

    expect(svg).toContain('href="https://github.com/org/repo-0"');
    expect(svg).toContain('href="https://github.com/org/repo-1"');
  });

  it('includes repo names in text elements', () => {
    const svg = renderDetailed(createAvatars(2));

    expect(svg).toContain('org/repo-0</text>');
    expect(svg).toContain('org/repo-1</text>');
  });

  it('includes formatted star counts', () => {
    const avatars: AvatarData[] = [
      { dataUri: 'data:image/png;base64,a', fullName: 'org/big', stars: 5432 },
      { dataUri: 'data:image/png;base64,b', fullName: 'org/small', stars: 42 },
    ];
    const svg = renderDetailed(avatars);

    expect(svg).toContain('★ 5.4k</text>');
    expect(svg).toContain('★ 42</text>');
  });

  it('handles avatars without stars', () => {
    const avatars: AvatarData[] = [
      { dataUri: 'data:image/png;base64,a', fullName: 'org/no-stars' },
    ];
    const svg = renderDetailed(avatars);

    expect(svg).not.toContain('★');
  });

  it('escapes special characters in repo names', () => {
    const avatars: AvatarData[] = [
      {
        dataUri: 'data:image/png;base64,a',
        fullName: 'org/<repo>&"name',
        stars: 10,
      },
    ];
    const svg = renderDetailed(avatars);

    expect(svg).toContain('org/&lt;repo&gt;&amp;&quot;name</text>');
    expect(svg).not.toContain('<repo>');
  });

  it('truncates long repo names with ellipsis', () => {
    const avatars: AvatarData[] = [
      {
        dataUri: 'data:image/png;base64,a',
        fullName: 'some-long-org/very-long-repo-name',
        stars: 10,
      },
    ];
    const svg = renderDetailed(avatars);

    expect(svg).toContain('some-long-org/very-…</text>');
    // href should still have the full name
    expect(svg).toContain(
      'href="https://github.com/some-long-org/very-long-repo-name"'
    );
  });

  it('does not truncate short repo names', () => {
    const avatars: AvatarData[] = [
      {
        dataUri: 'data:image/png;base64,a',
        fullName: 'org/repo',
        stars: 10,
      },
    ];
    const svg = renderDetailed(avatars);

    expect(svg).toContain('org/repo</text>');
  });

  it('renders a single avatar correctly', () => {
    const svg = renderDetailed(createAvatars(1));

    expect(svg).toContain('width="200"');
    expect(svg).toContain('height="48"');
    const imageCount = (svg.match(/<image /g) ?? []).length;
    expect(imageCount).toBe(1);
  });

  it('uses 48px avatar size', () => {
    const svg = renderDetailed(createAvatars(1));

    expect(svg).toContain('width="48" height="48"');
  });

  it('uses circular clip paths', () => {
    const svg = renderDetailed(createAvatars(1));

    expect(svg).toContain('<clipPath id="clip-0">');
    expect(svg).toContain('r="24"');
  });
});
