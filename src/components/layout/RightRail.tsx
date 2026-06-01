import type { ReactNode } from 'react';

/**
 * Contextual right rail (frontend/CLAUDE.md §4): Upcoming Deadlines, This Week
 * calendar strip, Recent Activity. Block 2 is an empty placeholder column;
 * pages compose contextual widgets into it in later phases.
 */
export function RightRail({ children }: { children?: ReactNode }) {
  return (
    <aside className="hidden w-80 shrink-0 border-l bg-background p-6 xl:block" aria-label="Contextual">
      {children}
    </aside>
  );
}
