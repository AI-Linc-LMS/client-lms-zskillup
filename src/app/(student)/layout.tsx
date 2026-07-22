import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { CartProvider } from '@/components/billing/CartProvider';
import { ChatWidget } from '@/components/assistant/ChatWidget';
import { CalibrationPrompt } from '@/components/student/CalibrationPrompt';
import { GuideProvider } from '@/components/guide/GuideProvider';
import { PlatformGuidePrompt } from '@/components/student/PlatformGuidePrompt';

/**
 * Student route-group layout. Wraps every (student) page in the shared AppShell
 * chrome (frontend/CLAUDE.md §4). Role gating (route-group RBAC) is added in
 * middleware in Block 3 - this layout owns the visual shell only. CartProvider
 * makes the multi-item purchase cart available across the whole student area, and
 * the ChatWidget floats the help assistant in the bottom-right on every page.
 *
 * GuideProvider drives the platform walkthrough (spotlight coachmark tour) and
 * wraps the AppShell so the top-bar "?" launcher can control it. First-login
 * ordering: the guide prompt comes first; the calibration prompt is gated on
 * `hasSeenGuide` (see CalibrationPrompt) so it only appears once the guide is done.
 */
export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <GuideProvider>
        <AppShell>{children}</AppShell>
        <ChatWidget />
        <PlatformGuidePrompt />
        <CalibrationPrompt />
      </GuideProvider>
    </CartProvider>
  );
}
