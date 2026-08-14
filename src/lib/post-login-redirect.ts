/**
 * Where to send someone once they finish signing in.
 *
 * The middleware bounces an unauthenticated visitor to `/login?redirect=<path>`,
 * but that param only survives as long as the user stays on the login page. A NEW
 * user goes /signup -> /signup/verify -> /signup/onboarding, and each hop
 * previously started from a clean URL, so the destination they originally asked
 * for was lost and everyone landed on /dashboard. The same happened to an
 * EXISTING but un-onboarded user, because login routes them through onboarding
 * too.
 *
 * So the destination is stashed ONCE, when it is first seen, and consumed ONCE at
 * whichever step finishes the flow. sessionStorage is the right store: it is
 * per-tab (two concurrent signups can't steal each other's destination), it
 * survives the multi-step flow and the Google OAuth round trip, and it dies with
 * the tab so a stale destination can never resurface days later.
 */

const KEY = 'zsk:post-login-redirect';

/**
 * Accept only a same-origin, absolute PATH.
 *
 * `startsWith('/')` is not enough on its own: `//evil.com` and `/\evil.com` are
 * protocol-relative URLs that browsers resolve to another origin, so treating
 * them as internal paths turns the login page into an open redirect — a link
 * anyone can share to bounce a freshly-authenticated user off-site under our
 * domain's credibility. Anything that is not unambiguously local is dropped.
 */
export function sanitizeRedirect(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value.startsWith('/')) return null;
  // Protocol-relative ("//host" or the backslash variants browsers normalise).
  if (/^\/[\\/]/.test(value)) return null;
  // Control characters and whitespace: browsers strip some of these before
  // resolving, so "/\thttps://evil.com" can smuggle a scheme past a naive check.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0020\u007f]/.test(value)) return null;
  // Never bounce back into the auth flow itself — that loops.
  if (value === '/login' || value.startsWith('/login?')) return null;
  if (value.startsWith('/signup')) return null;
  return value;
}

/** Remember where the visitor was heading, if it is a safe local path. */
export function stashRedirect(raw: string | null | undefined): void {
  const safe = sanitizeRedirect(raw);
  if (!safe || typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(KEY, safe);
  } catch {
    // Private mode / storage disabled — the ?redirect= param still covers the
    // single-page login case, so this is a graceful degradation, not a failure.
  }
}

/**
 * Read AND clear the stashed destination. Consumed once so a later sign-in in the
 * same tab doesn't get dragged back to a page the user has long since left.
 */
export function takeRedirect(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.sessionStorage.getItem(KEY);
    if (value) window.sessionStorage.removeItem(KEY);
    return sanitizeRedirect(value);
  } catch {
    return null;
  }
}

/** Peek without consuming (for building a link's href). */
export function peekRedirect(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sanitizeRedirect(window.sessionStorage.getItem(KEY));
  } catch {
    return null;
  }
}
