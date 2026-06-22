import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Sora } from 'next/font/google';
import './globals.css';

// Body — Plus Jakarta Sans: clean, modern, friendly. Headings — Sora: a crisp
// geometric display face for a fresh, distinctive hierarchy.
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
});
const sora = Sora({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sora',
});

export const metadata: Metadata = {
  title: 'ZSkillup — Placement preparation, simplified',
  description:
    'Real previous-year questions for TCS, Infosys, Wipro, Cognizant, Capgemini and Accenture. Live mock drives, expert instructors, and verified certificates accepted by 1,200+ campus placement cells.',
  icons: {
    icon: '/images/Zskillup Black.png',
    shortcut: '/images/Zskillup Black.png',
    apple: '/images/Zskillup Black.png',
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
    <html lang="en" className={`${jakarta.variable} ${sora.variable}`}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
