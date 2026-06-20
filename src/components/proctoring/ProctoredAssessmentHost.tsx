'use client';

import { useState } from 'react';
import { DeviceCheck } from '@/components/proctoring/DeviceCheck';
import { MockRunner } from '@/components/practice/MockRunner';

/**
 * Proctored assessment host (Phase 4): device-check gate → proctored MockRunner.
 * Used when an assessment is launched with ?proctored=1 (from the calendar /
 * company drive when the window is open).
 */
export function ProctoredAssessmentHost({ mockId, title }: { mockId: string; title?: string }) {
  const [ready, setReady] = useState(false);
  if (!ready) {
    return <DeviceCheck title={title ?? 'This assessment'} onReady={() => setReady(true)} />;
  }
  return <MockRunner mockId={mockId} proctored />;
}
