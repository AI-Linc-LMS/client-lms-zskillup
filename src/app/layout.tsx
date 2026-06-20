import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
