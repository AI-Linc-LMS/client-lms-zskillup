import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { PreviewBanner } from './PreviewBanner';
import { FestiveBanner } from '@/components/marketing/FestiveBanner';
import { CommandPalette } from './CommandPalette';
import { SeoTitle } from './SeoTitle';
import { AutopayOffer } from '@/components/payments/AutopayOffer';

/**
 * Persistent authenticated chrome (frontend/CLAUDE §4): top bar + left sidebar +
 * content. Built ONCE and composed by each authenticated page - never
 * re-implemented per page. Pages compose their own contextual right rail inside
 * the content area so the layout stays flexible.
 *
 * Server Component; only the leaves that need interactivity (Explore menu,
 * sidebar active-route highlight, avatar, preview banner) opt into "use client".
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SeoTitle />
      <CommandPalette />
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: { borderRadius: '12px', fontFamily: 'var(--font-sans)' },
        }}
        richColors
      />
      <TopBar />
      {/* Offers autopay after a one-time purchase. Idle until a checkout announces one. */}
      <AutopayOffer />
      {/* Full-width super-admin "view as student" banner (renders only while previewing). */}
      <PreviewBanner />
      {/* The festive strip sits in the shell rather than on the page, because this is
          the only level that spans the whole window: inside the page it would be as
          narrow as the content column and stop short of the sidebar and right rail.
          Limited to the dashboard, which is where it was asked for. */}
      <FestiveBanner restrictTo={['/dashboard']} />
      <div className="flex flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-x-clip px-4 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  );
}
