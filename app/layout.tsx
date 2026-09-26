import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3000'),
  title: 'The Second Chapter | Pre-loved book drops',
  description: 'Browse the latest pre-loved books and claim your next great read in a few taps.',
  icons: { icon: '/favicon.svg', shortcut: '/favicon.svg' },
  openGraph: {
    title: 'The Second Chapter',
    description: 'Good stories deserve another reader. Browse the latest pre-loved book drop.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'The Second Chapter — Good stories deserve another reader.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Second Chapter',
    description: 'Good stories deserve another reader. Browse the latest pre-loved book drop.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
