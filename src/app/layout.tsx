import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Chiquel Wig Matcher',
  description: 'AI-powered wig matching and recommendation system',
  keywords: ['wig', 'hair', 'beauty', 'AI', 'recommendations', 'Shopify'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#e91e63" />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}