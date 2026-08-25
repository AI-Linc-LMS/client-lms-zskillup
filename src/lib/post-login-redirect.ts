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

/**
 * Append the destination to a URL as ?redirect=, so the next step of a multi-step
 * flow carries it in the ADDRESS BAR rather than only in sessionStorage.
 *
 * The stash alone was not enough. It is lost whenever the browser drops session
 * storage, and that is not exotic: site data blocked by policy or extension throws
 * SecurityError on the very first read, opening the verification step in a fresh tab
 * starts an empty store, and signing up on a phone but verifying on a laptop never
 * shares one at all. Each of those silently landed a paying visitor on /dashboard with
 * an empty cart, which looks like the campaign link simply not working.
 *
 * Belt and braces: the URL is authoritative, the stash still covers a hop that cannot
 * carry a param (the Google OAuth round trip).
 */
export function withRedirect(url: string, redirect: string | null | undefined): string {
  const safe = sanitizeRedirect(redirect);
  if (!safe) return url;
  return `${url}${url.includes('?') ? '&' : '?'}redirect=${encodeURIComponent(safe)}`;
}

/**
 * The destination for THIS step: the URL wins, the stash is the fallback.
 *
 * Reads without consuming when it comes from the URL - a param is naturally idempotent,
 * and consuming it would break a refresh.
 */
export function resolveRedirect(fromUrl: string | null | undefined): string | null {
  return sanitizeRedirect(fromUrl) ?? takeRedirect();
}
