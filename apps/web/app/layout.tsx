import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: 'usedby.dev — Showcase your open-source dependents',
  description:
    'A free service that lets open-source maintainers showcase which projects depend on their library via a single embeddable image. No API key, no sign-up, no config.',
  metadataBase: new URL('https://usedby.dev'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'usedby.dev — Showcase your open-source dependents',
    description:
      'Generate a beautiful embeddable image showing the top dependents of any npm package. One line of Markdown, zero config.',
    url: 'https://usedby.dev',
    siteName: 'usedby.dev',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
