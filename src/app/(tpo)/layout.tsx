import type { ReactNode } from 'react';
import { TpoShell } from '@/components/tpo/TpoShell';

/**
 * Placement Office (COLLEGE_ADMIN / TPO) console - uses its own TpoShell chrome
 * (dedicated sidebar + top bar) rather than the shared student/admin AppShell.
 */
export default function TpoLayout({ children }: { children: ReactNode }) {
  return <TpoShell>{children}</TpoShell>;
}
