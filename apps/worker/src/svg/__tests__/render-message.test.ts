import { describe, it, expect } from 'vitest';
import { renderMessage } from '../render-message';

describe('renderMessage', () => {
  it('produces valid SVG structure', () => {
    const svg = renderMessage('Hello');

    expect(svg).toMatch(/^<svg /);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toMatch(/<\/svg>$/);
  });

  it('renders the message as text content', () => {
    const svg = renderMessage('No dependents found');

    expect(svg).toContain('>No dependents found</text>');
  });

  it('has 300x40 dimensions', () => {
    const svg = renderMessage('Test');

    expect(svg).toContain('width="300"');
    expect(svg).toContain('height="40"');
    expect(svg).toContain('viewBox="0 0 300 40"');
  });

  it('includes accessibility attributes', () => {
    const svg = renderMessage('Something went wrong');

    expect(svg).toContain('role="img"');
    expect(svg).toContain('aria-label="Something went wrong"');
  });

  it('escapes special characters for XSS prevention', () => {
    const svg = renderMessage('<script>"alert&\'</script>');

    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
    expect(svg).toContain('&quot;');
    expect(svg).toContain('&amp;');
    expect(svg).toContain('&#39;');
  });

  it('renders centered text styling', () => {
    const svg = renderMessage('Test');

    expect(svg).toContain('text-anchor="middle"');
    expect(svg).toContain('x="150"');
    expect(svg).toContain('class="text-secondary"');
    expect(svg).not.toContain('fill="#666"');
    expect(svg).toContain('font-size="14"');
  });

  it('includes a style block', () => {
    const svg = renderMessage('Test');

    expect(svg).toContain('<style>');
    expect(svg).toContain('</style>');
  });
});
