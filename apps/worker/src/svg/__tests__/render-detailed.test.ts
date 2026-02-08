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
    // 24 characters
    expect(truncateName('org/repo-name-exactly-ok')).toBe(
      'org/repo-name-exactly-ok'
    );
  });

  it('truncates names over the limit with ellipsis', () => {
    // 25 characters → truncated to 23 + …
    expect(truncateName('org/repo-name-exactly-ok!')).toBe(
      'org/repo-name-exactly-o…'
    );
  });

  it('truncates long names', () => {
    expect(truncateName('some-long-org/very-long-repo-name')).toBe(
      'some-long-org/very-long…'
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

  it('renders 3-column layout', () => {
    const svg = renderDetailed(createAvatars(3));

    // 3 cards × 260px + 2 × 12px gap = 804
    expect(svg).toContain('width="804"');
    // 1 row × 64px = 64
    expect(svg).toContain('height="64"');
  });

  it('computes correct dimensions for multiple rows', () => {
    const svg = renderDetailed(createAvatars(9));

    // 3 columns × 260 + 2 × 12 = 804
    expect(svg).toContain('width="804"');
    // ceil(9/3) = 3 rows: 3 × 64 + 2 × 12 = 216
    expect(svg).toContain('height="216"');
  });

  it('uses fewer columns when fewer avatars', () => {
    const svg = renderDetailed(createAvatars(2));

    // 2 columns × 260 + 1 × 12 = 532
    expect(svg).toContain('width="532"');
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

    expect(svg).toContain('some-long-org/very-long…</text>');
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

  it('uses CSS classes for text colors', () => {
    const svg = renderDetailed(createAvatars(1));

    expect(svg).toContain('class="text-primary"');
    expect(svg).toContain('class="text-secondary"');
    expect(svg).not.toContain('fill="#333"');
    expect(svg).not.toContain('fill="#666"');
  });

  it('includes a style block', () => {
    const svg = renderDetailed(createAvatars(1));

    expect(svg).toContain('<style>');
    expect(svg).toContain('</style>');
  });

  it('renders a single avatar correctly', () => {
    const svg = renderDetailed(createAvatars(1));

    expect(svg).toContain('width="260"');
    expect(svg).toContain('height="64"');
    const imageCount = (svg.match(/<image /g) ?? []).length;
    expect(imageCount).toBe(1);
  });

  it('uses 64px avatar size', () => {
    const svg = renderDetailed(createAvatars(1));

    expect(svg).toContain('width="64" height="64"');
  });

  it('uses circular clip paths', () => {
    const svg = renderDetailed(createAvatars(1));

    expect(svg).toContain('<clipPath id="clip-0">');
    expect(svg).toContain('r="32"');
  });
});
