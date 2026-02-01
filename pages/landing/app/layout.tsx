import type { Metadata } from 'next';
import { Montserrat, Nunito } from 'next/font/google';
import './globals.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'React on X with Frens - The Social Meme Wallet',
  description: 'Show love where it matters. The social meme wallet for X.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${montserrat.variable} ${nunito.variable}`}>
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
