import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Instrument_Serif, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

// Design direction "Night Lab + Blueprint" (see memory/design-direction.md).
// Body — Plus Jakarta Sans: clean, modern, friendly. Headings — Bricolage
// Grotesque: a characterful grotesque that keeps the brand out of generic-SaaS
// territory. Instrument Serif (italic) is the sparing editorial garnish for
// hero headlines only.
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
});
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-bricolage',
});
const instrument = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-instrument',
});

export const metadata: Metadata = {
  title: 'ZSkillup - Placement preparation, simplified',
  description:
    'Real previous-year questions for TCS, Infosys, Wipro, Cognizant, Capgemini and Accenture. Live mock drives, expert instructors, and verified certificates accepted by 1,200+ campus placement cells.',
  icons: {
    icon: '/images/prephasz-icon.png',
    shortcut: '/images/prephasz-icon.png',
    apple: '/images/prephasz-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${jakarta.variable} ${bricolage.variable} ${instrument.variable}`}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
