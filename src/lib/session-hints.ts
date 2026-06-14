/**
 * Client-side session HINT cookies — ONE reader module (no per-component
 * regexes). These are UX hints set by the login/preview flows; the backend
 * guards remain the security boundary (CLAUDE.md §5).
 *
 *   role=STUDENT|COLLEGE_ADMIN|SUPER_ADMIN  — set on login, cleared on logout
 *   onboarded=0|1                            — set on login/onboarding
 *   preview=student                          — set while a super-admin runs the
 *                                              "view as student" preview
 */

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
