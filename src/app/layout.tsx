import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Playfair_Display, Poppins } from 'next/font/google';
import { env } from '@/lib/env';
import Ambient from '@/components/Ambient';
import './globals.css';

/**
 * Poppins for headings — geometric, high contrast in bold, and it sits
 * well under the brush-script logo without competing with it.
 * Inter for everything else: built for screens, and its tabular numbers
 * keep variant prices aligned in a column.
 * JetBrains Mono stays on prices and SKUs.
 * Playfair is loaded but used sparingly — see --font-serif in globals.css.
 */
const display = Poppins({
  subsets: ['latin'],
  // Only the weights the site actually uses. Each extra weight is another
  // file the browser downloads before text settles.
  weight: ['600', '700'],
  variable: '--font-display',
  display: 'swap',
});
const body = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });
const serif = Playfair_Display({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: {
    default: 'iSeven Mobiles — Genuine phones in Sri Lanka',
    template: '%s | iSeven Mobiles',
  },
  description:
    'Warranty-backed smartphones and accessories, island-wide delivery across Sri Lanka. Browse the stock, then message us on WhatsApp for the real price.',
  openGraph: {
    type: 'website',
    siteName: 'iSeven Mobiles',
    locale: 'en_LK',
    images: ['/logo.png'],
  },
  icons: { icon: '/icon.png', apple: '/logo-mark.png' },
  robots: {
    index: true,
    follow: true,
    googleBot: { 'max-image-preview': 'large', 'max-snippet': -1 },
  },
};

export const viewport = { themeColor: '#000000' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable} ${serif.variable}`}>
      <body>
        <Ambient />
        {children}
      </body>
    </html>
  );
}
