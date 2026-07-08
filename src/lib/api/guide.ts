import { apiClient } from './client';

/** Broadcast so any mounted useGuideSeen updates instantly (e.g. the calibration
 *  prompt surfaces the moment the guide ends, without waiting for a refetch). */
export const GUIDE_SEEN_EVENT = 'zskillup:guide-seen';

/**
 * Platform-guide completion. The backend stores `guide_completed_at` on the
 * student profile (exposed as `hasSeenGuide` via getMe); this marks it seen so
 * the first-login walkthrough doesn't re-pop. Idempotent.
 */
export async function markGuideSeen(): Promise<void> {
  // Optimistically notify listeners first so the UI reacts immediately even if
  // the request is slow; the flag is idempotent server-side.
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(GUIDE_SEEN_EVENT));
  await apiClient.post('/api/v1/me/guide/complete', {});
}
