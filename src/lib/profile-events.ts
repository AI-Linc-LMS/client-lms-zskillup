'use client';

/**
 * Cross-component signal so profile-completion consumers (the dashboard banner,
 * the sidebar/feature lock gates) re-fetch the instant the student saves their
 * profile — instead of staying stale until the next window focus. Browser-only.
 */
const PROFILE_UPDATED = 'zskillup:profile-updated';

export function notifyProfileUpdated(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(PROFILE_UPDATED));
}

/** Subscribe to profile-save events; returns an unsubscribe fn (use in useEffect). */
export function onProfileUpdated(fn: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(PROFILE_UPDATED, fn);
  return () => window.removeEventListener(PROFILE_UPDATED, fn);
}
