import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';

/** Platform Admin console (internal operator, below Super Admin). Shares the
 *  AppShell; the sidebar switches to ADMIN_NAV via navForPath('/admin'). */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
