import type { Metadata } from 'next';
import { Space_Grotesk, Space_Mono } from 'next/font/google';

import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-space-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "usedby.dev — Showcase your library's dependents",
  description:
    'An embeddable image that showcases which projects depend on your open-source library. No API keys, no build step, no configuration.',
};

export default function RootLayout({ children }: React.PropsWithChildren) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${spaceMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
