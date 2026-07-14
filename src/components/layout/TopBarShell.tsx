import type { ReactNode } from 'react';
import { TopBar } from './TopBar';

/**
 * Lighter authenticated shell: persistent TopBar + full-width content, no left
 * sidebar. Used by Companies, the company hub (COMPANY_HUB_SPEC §1 — "no left
 * sidebar inside the hub"), and Prepare. Reuses the same TopBar chrome as the
 * full AppShell — the shell is never re-implemented per page.
 *
 * Aurora redesign: a soft ambient glow bleeds down from the top of the page,
 * sitting behind the bar and content so the glassy TopBar reads against gentle
 * colour rather than flat grey. Decorative only (pointer-events-none).
 */
export function TopBarShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background">
      {/* ambient aurora wash behind the top of the page */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-72 overflow-hidden">
        <div className="absolute -left-24 -top-28 size-72 rounded-full bg-[#f5b400]/10 blur-[110px]" />
        <div className="absolute right-0 -top-32 size-72 rounded-full bg-[#6d3bf5]/10 blur-[120px]" />
      </div>

      <TopBar />
      {children}
    </div>
  );
}
