import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3000'),
  title: 'Dog-Eared Books | Pre-loved book drops',
  description: 'Browse the latest pre-loved books and claim your next great read in a few taps.',
  openGraph: {
    title: 'Dog-Eared Books',
    description: 'Good stories deserve another reader. Browse the latest pre-loved book drop.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Dog-Eared Books — Good stories deserve another reader.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dog-Eared Books',
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
