/**
 * Fullscreen helpers for proctored assessments.
 *
 * Browsers only honour requestFullscreen() inside a user activation, and the old path
 * requested it AFTER the start round-trip (useProctoring.start), by which time the
 * activation was often gone - so candidates quietly began un-fullscreened. Callers
 * must invoke requestAssessmentFullscreen() SYNCHRONOUSLY in the click handler that
 * starts the attempt (no await before it).
 *
 * Always <html>: the details gate portals to <body>, so it stays visible while the
 * document is fullscreen. Never throws and never blocks - the exam outranks proctoring.
 */

export function fullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false;
  return !!document.fullscreenEnabled && typeof document.documentElement.requestFullscreen === 'function';
}

export function requestAssessmentFullscreen(): void {
  if (!fullscreenSupported() || document.fullscreenElement) return;
  try {
    void document.documentElement.requestFullscreen().catch(() => {});
  } catch {
    /* ignore - the in-exam prompt offers it again from a real click */
  }
}
