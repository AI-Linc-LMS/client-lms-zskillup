/**
 * Client-side session HINT cookies - ONE reader module (no per-component
 * regexes). These are UX hints set by the login/preview flows; the backend
 * guards remain the security boundary (CLAUDE.md §5).
 *
 *   role=STUDENT|COLLEGE_ADMIN|SUPER_ADMIN  - set on login, cleared on logout
 *   onboarded=0|1                            - set on login/onboarding
 *   preview=student                          - set while a super-admin runs the
 *                                              "view as student" preview
 */

/**
 * Hint cookies are given the SAME lifetime as the refresh session (7 days) and
 * are re-stamped on every token refresh (see client.ts). A session cookie (no
 * Max-Age) vanished on a browser restart while the HttpOnly refresh session was
 * still alive - leaving the middleware, whose ONLY session signal is `role`,
 * bouncing a genuinely-authenticated user to /login.
 */
export const SESSION_HINT_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/** Write the durable `role` hint (UX only - Nest guards are the authority). */
export function writeRoleHint(role: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `role=${role}; path=/; max-age=${SESSION_HINT_MAX_AGE_SECONDS}; samesite=lax`;
}

/** Write the durable `onboarded` hint. */
export function writeOnboardedHint(onboarded: boolean): void {
  if (typeof document === 'undefined') return;
  document.cookie = `onboarded=${onboarded ? '1' : '0'}; path=/; max-age=${SESSION_HINT_MAX_AGE_SECONDS}; samesite=lax`;
}

/** Clear every session hint (role, onboarded, preview) on logout / teardown. */
export function clearSessionHints(): void {
  if (typeof document === 'undefined') return;
  document.cookie = 'role=; path=/; max-age=0; samesite=lax';
  document.cookie = 'onboarded=; path=/; max-age=0; samesite=lax';
  document.cookie = 'preview=; path=/; max-age=0; samesite=lax';
}

export function roleHint(): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|;\s*)role=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function hasRoleHint(): boolean {
  return roleHint() !== null;
}

/** True while the super-admin "view as student" preview hint is set. */
export function hasPreviewHint(): boolean {
  if (typeof document === 'undefined') return false;
  return /(^|;\s*)preview=student(;|$)/.test(document.cookie);
}

/**
 * True when API calls on this page should run in STUDENT context: a real
 * student session, or a super-admin inside the "view as student" preview.
 */
export function isStudentContext(): boolean {
  const role = roleHint();
  return role === 'STUDENT' || (role === 'SUPER_ADMIN' && hasPreviewHint());
}
