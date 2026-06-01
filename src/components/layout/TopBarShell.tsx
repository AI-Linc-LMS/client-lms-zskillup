import type { ReactNode } from 'react';
import { TopBar } from './TopBar';

/**
 * Lighter authenticated shell: persistent TopBar + full-width content, no left
 * sidebar. Used by Companies, the company hub (COMPANY_HUB_SPEC §1 — "no left
 * sidebar inside the hub"), and Prepare. Reuses the same TopBar chrome as the
 * full AppShell — the shell is never re-implemented per page.
 */
export function TopBarShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      <TopBar />
      {children}
    </div>
  );
}
