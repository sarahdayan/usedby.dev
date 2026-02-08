import { renderMosaic } from '@svg/render-mosaic';
import type { RenderOptions } from '@svg/types';

import { createMockAvatars } from './data';

const styleSelect = document.getElementById('style') as HTMLSelectElement;
const avatarCountRange = document.getElementById(
  'avatar-count'
) as HTMLInputElement;
const avatarCountValue = document.getElementById('avatar-count-value')!;
const badgeCheckbox = document.getElementById('badge') as HTMLInputElement;
const dependentCountInput = document.getElementById(
  'dependent-count'
) as HTMLInputElement;

const lightOutput = document.querySelector<HTMLDivElement>(
  '.preview.light .svg-output'
)!;
const darkOutput = document.querySelector<HTMLDivElement>(
  '.preview.dark .svg-output'
)!;

function renderToIframe(container: HTMLDivElement, svg: string, title: string) {
  let iframe = container.querySelector('iframe');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.style.border = 'none';
    iframe.style.width = '100%';
    iframe.style.display = 'block';
    iframe.title = title;
    container.appendChild(iframe);
  }
  iframe.style.height = '0';
  iframe.srcdoc = `<!doctype html><html><head><style>body{margin:0;overflow-x:auto;overflow-y:hidden}</style></head><body>${svg}</body></html>`;
  iframe.onload = () => {
    const doc = iframe!.contentDocument;
    if (doc) {
      iframe!.style.height = `${doc.body.scrollHeight}px`;
    }
  };
}

function render() {
  const style = styleSelect.value as RenderOptions['style'];
  const count = Number(avatarCountRange.value);
  const showBadge = badgeCheckbox.checked;
  const dependentCount = Math.max(1, Number(dependentCountInput.value));

  avatarCountValue.textContent = String(count);

  const avatars = createMockAvatars(count);
  const base: RenderOptions = {
    style,
    dependentCount: showBadge ? dependentCount : undefined,
  };

  renderToIframe(
    lightOutput,
    renderMosaic(avatars, { ...base, theme: 'light' }),
    'SVG preview (light)'
  );
  renderToIframe(
    darkOutput,
    renderMosaic(avatars, { ...base, theme: 'dark' }),
    'SVG preview (dark)'
  );
}

let debounceTimer: ReturnType<typeof setTimeout>;

function debouncedRender() {
  clearTimeout(debounceTimer);

  avatarCountValue.textContent = avatarCountRange.value;
  debounceTimer = setTimeout(render, 80);
}

avatarCountRange.addEventListener('input', debouncedRender);
dependentCountInput.addEventListener('input', debouncedRender);
styleSelect.addEventListener('input', render);
badgeCheckbox.addEventListener('input', render);

const previews = document.querySelector<HTMLDivElement>('.previews')!;

for (const btn of document.querySelectorAll<HTMLButtonElement>('.expand-btn')) {
  btn.addEventListener('click', () => {
    const section = btn.closest<HTMLElement>('.preview')!;
    const isExpanded = section.classList.contains('expanded');

    for (const p of document.querySelectorAll('.preview')) {
      p.classList.remove('expanded');
    }
    previews.classList.remove('has-expanded');

    if (!isExpanded) {
      section.classList.add('expanded');
      previews.classList.add('has-expanded');
    }

    render();
  });
}

render();
