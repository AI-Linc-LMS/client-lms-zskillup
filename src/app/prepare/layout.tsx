import type { ReactNode } from 'react';
import { TopBarShell } from '@/components/layout/TopBarShell';

export default function PrepareLayout({ children }: { children: ReactNode }) {
  return <TopBarShell>{children}</TopBarShell>;
}
