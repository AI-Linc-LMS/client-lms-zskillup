import type { ReactNode } from 'react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { PreviewBanner } from './PreviewBanner';
import { CommandPalette } from './CommandPalette';

/**
 * Persistent authenticated chrome (frontend/CLAUDE §4): top bar + left sidebar +
 * content. Built ONCE and composed by each authenticated page — never
 * re-implemented per page. Pages compose their own contextual right rail inside
 * the content area so the layout stays flexible.
 *
 * Server Component; only the leaves that need interactivity (Explore menu,
 * sidebar active-route highlight, avatar, preview banner) opt into "use client".
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CommandPalette />
      <TopBar />
      {/* Full-width super-admin "view as student" banner (renders only while previewing). */}
      <PreviewBanner />
      <div className="flex flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-x-clip px-4 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  );
}
