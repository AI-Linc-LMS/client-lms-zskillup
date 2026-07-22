'use client';

/**
 * Tiny cross-component signal so the dashboard stat cards + hero refresh the
 * moment any widget awards XP/coins/streak (Quick Aptitude, Daily Challenge,
 * Challenges, the reward overlay) - without a full page reload. Browser-only.
 */
const XP_UPDATED = 'zskillup:xp-updated';

export function notifyXpUpdated(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(XP_UPDATED));
}

/** Subscribe to award events; returns an unsubscribe fn (use in useEffect). */
export function onXpUpdated(fn: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(XP_UPDATED, fn);
  return () => window.removeEventListener(XP_UPDATED, fn);
}
