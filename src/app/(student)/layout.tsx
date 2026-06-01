import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';

/**
 * Student route-group layout. Wraps every (student) page in the shared AppShell
 * chrome (frontend/CLAUDE.md §4). Role gating (route-group RBAC) is added in
 * middleware in Block 3 — this layout owns the visual shell only.
 */
export default function StudentLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
