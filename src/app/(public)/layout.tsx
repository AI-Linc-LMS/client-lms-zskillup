import type { ReactNode } from 'react';
import { ChatWidget } from '@/components/assistant/ChatWidget';

/**
 * Public/marketing route-group layout. Floats the help assistant on the landing
 * and other public pages so visitors can ask questions before signing up (the
 * assistant endpoint is public). Admin/TPO consoles deliberately don't get it.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ChatWidget />
    </>
  );
}
