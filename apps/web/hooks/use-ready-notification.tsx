'use client';

import { useCallback, useEffect, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { AppIcon } from '@/components/app-icon';

export function useReadyNotification() {
  const firedRef = useRef(false);

  useEffect(() => {
    warmAudioContext();

    function onInteraction() {
      warmAudioContext();

      document.removeEventListener('pointerdown', onInteraction);
      document.removeEventListener('keydown', onInteraction);
    }

    document.addEventListener('pointerdown', onInteraction);
    document.addEventListener('keydown', onInteraction);

    return () => {
      document.removeEventListener('pointerdown', onInteraction);
      document.removeEventListener('keydown', onInteraction);
    };
  }, []);

  const notify = useCallback((onReturn?: () => void): boolean => {
    if (firedRef.current) {
      return true;
    }

    if (document.visibilityState !== 'hidden') {
      return false;
    }

    firedRef.current = true;

    const originalTitle = document.title;
    document.title = `(1) ${originalTitle}`;

    const link = getFaviconLink();

    if (link) {
      link.href =
        'data:image/svg+xml,' +
        encodeURIComponent(renderToStaticMarkup(<AppIcon notificationDot />));
    }

    // Survives component unmount
    function onVisible() {
      if (document.visibilityState !== 'visible') {
        return;
      }

      document.title = originalTitle;

      if (link) {
        link.href =
          'data:image/svg+xml,' +
          encodeURIComponent(renderToStaticMarkup(<AppIcon />));
      }

      document.removeEventListener('visibilitychange', onVisible);

      playChime();
      onReturn?.();
    }

    document.addEventListener('visibilitychange', onVisible);

    return true;
  }, []);

  return notify;
}

let context: AudioContext | null = null;

function warmAudioContext() {
  if (!context) {
    try {
      context = new AudioContext();
    } catch {
      return;
    }
  }

  if (context.state === 'suspended') {
    context.resume().catch(() => {});
  }
}

function playChime() {
  if (!context || context.state !== 'running') {
    return;
  }

  const now = context.currentTime;
  const notes = [523.25, 659.25];

  for (let i = 0; i < notes.length; i++) {
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = 'sine';
    osc.frequency.value = notes[i]!;

    const start = now + i * 0.15;

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.3, start + 0.02);
    gain.gain.linearRampToValueAtTime(0, start + 0.15);

    osc.connect(gain).connect(context.destination);
    osc.start(start);
    osc.stop(start + 0.15);
  }
}

function getFaviconLink(): HTMLLinkElement | null {
  return document.querySelector<HTMLLinkElement>('link[rel="icon"]');
}
