import { describe, it, expect } from 'vitest';
import { escapeXml, renderAvatar } from '../avatar';
import type { AvatarData, AvatarPosition } from '../types';

const avatar: AvatarData = {
  dataUri: 'data:image/png;base64,abc123',
  fullName: 'facebook/react',
};

const position: AvatarPosition = {
  cx: 32,
  cy: 32,
  index: 0,
};

const avatarSize = 64;

describe('renderAvatar', () => {
  it('contains a clipPath with a unique ID in def', () => {
    const { def } = renderAvatar(avatar, position, avatarSize);

    expect(def).toContain('<clipPath id="clip-0">');
  });

  it('contains a circular clip with correct cx/cy/r', () => {
    const { def } = renderAvatar(avatar, position, avatarSize);

    expect(def).toContain('<circle cx="32" cy="32" r="32"/>');
  });

  it('contains an image with the data URI href', () => {
    const { body } = renderAvatar(avatar, position, avatarSize);

    expect(body).toContain('href="data:image/png;base64,abc123"');
  });

  it('contains a link to the GitHub repo', () => {
    const { body } = renderAvatar(avatar, position, avatarSize);

    expect(body).toContain('<a href="https://github.com/facebook/react">');
  });

  it('uses the correct position and size for the image', () => {
    const { body } = renderAvatar(avatar, position, avatarSize);

    expect(body).toContain('x="0" y="0" width="64" height="64"');
  });

  it('uses the index for unique clip IDs', () => {
    const pos5: AvatarPosition = { cx: 32, cy: 32, index: 5 };
    const { def, body } = renderAvatar(avatar, pos5, avatarSize);

    expect(def).toContain('<clipPath id="clip-5">');
    expect(body).toContain('clip-path="url(#clip-5)"');
  });

  it('escapes special characters in repo names', () => {
    const special: AvatarData = {
      dataUri: 'data:image/png;base64,abc',
      fullName: 'org/<repo>&"name',
    };
    const { body } = renderAvatar(special, position, avatarSize);

    expect(body).toContain('org/&lt;repo&gt;&amp;&quot;name');
    expect(body).not.toContain('<repo>');
  });
});

describe('escapeXml', () => {
  it('escapes ampersands', () => {
    expect(escapeXml('a&b')).toBe('a&amp;b');
  });

  it('escapes double quotes', () => {
    expect(escapeXml('a"b')).toBe('a&quot;b');
  });

  it('escapes angle brackets', () => {
    expect(escapeXml('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes single quotes', () => {
    expect(escapeXml("it's")).toBe('it&#39;s');
  });

  it('escapes all special characters together', () => {
    expect(escapeXml('<a href="x">&\'y</a>')).toBe(
      '&lt;a href=&quot;x&quot;&gt;&amp;&#39;y&lt;/a&gt;'
    );
  });

  it('returns clean strings unchanged', () => {
    expect(escapeXml('facebook/react')).toBe('facebook/react');
  });
});
