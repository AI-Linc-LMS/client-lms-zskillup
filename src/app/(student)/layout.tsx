import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { CartProvider } from '@/components/billing/CartProvider';
import { ChatWidget } from '@/components/assistant/ChatWidget';

/**
 * Student route-group layout. Wraps every (student) page in the shared AppShell
 * chrome (frontend/CLAUDE.md §4). Role gating (route-group RBAC) is added in
 * middleware in Block 3 — this layout owns the visual shell only. CartProvider
 * makes the multi-item purchase cart available across the whole student area, and
 * the ChatWidget floats the help assistant in the bottom-right on every page.
 */
export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <AppShell>{children}</AppShell>
      <ChatWidget />
    </CartProvider>
  );
}
