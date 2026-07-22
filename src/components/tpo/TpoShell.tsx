'use client';

import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { TpoConsoleProvider } from './TpoConsole';
import { TpoSidebar } from './TpoSidebar';
import { TpoTopBar } from './TpoTopBar';

/**
 * Placement Office console shell (redesign) - a dedicated sidebar-first layout
 * for the /tpo route group, replacing the shared AppShell here. The sidebar spans
 * full height on the left; a sticky top bar + the module content fill the rest.
 * All console state (college identity, selected batch, sidebar collapse) is
 * provided once at this level via TpoConsoleProvider.
 */
export function TpoShell({ children }: { children: ReactNode }) {
  return (
    <TpoConsoleProvider>
      <div className="flex min-h-dvh bg-background">
        <TpoSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TpoTopBar />
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
      <Toaster
        position="bottom-center"
        toastOptions={{ style: { borderRadius: '12px', fontFamily: 'var(--font-sans)' } }}
        richColors
      />
    </TpoConsoleProvider>
  );
}
