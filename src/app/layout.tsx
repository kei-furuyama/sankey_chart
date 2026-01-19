import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Sankey Chart - React Component Library',
    template: '%s | Sankey Chart',
  },
  description:
    'High-performance, customizable Sankey diagram component for React and Next.js applications.',
  keywords: ['sankey', 'chart', 'react', 'nextjs', 'visualization', 'd3', 'typescript'],
  authors: [{ name: 'Your Name' }],
  creator: 'Your Name',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://sankey-chart.vercel.app'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Sankey Chart',
    title: 'Sankey Chart - React Component Library',
    description:
      'High-performance, customizable Sankey diagram component for React and Next.js applications.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Sankey Chart',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sankey Chart - React Component Library',
    description:
      'High-performance, customizable Sankey diagram component for React and Next.js applications.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-white text-gray-900 antialiased dark:bg-slate-950 dark:text-gray-100">
        {children}
      </body>
    </html>
  );
}
