/**
 * Single source of truth for the API base URL.
 *
 * In a PRODUCTION browser this is `''` (same-origin), so every API call — and crucially the
 * session-cookie-setting ones (login, verify-email, refresh) — hits the backend on the page's
 * OWN host (prephasz.com), where Netlify proxies `/api/v1/*`, `/ready` and `/health` to the ALB
 * (see netlify.toml). That keeps the HttpOnly `zskillup_refresh` cookie FIRST-PARTY.
 *
 * Pointing NEXT_PUBLIC_API_URL at a different host (e.g. the raw `zskilluplms.netlify.app`
 * subdomain) makes that cookie THIRD-PARTY relative to prephasz.com — which Safari (ITP) and
 * Chrome (Incognito / "block third-party cookies" / the 3P phase-out) drop on `/auth/refresh`,
 * causing a 401 → forced logout → every account bouncing to /login on the first token refresh
 * (RCA 2026-08-13). Do NOT read `process.env.NEXT_PUBLIC_API_URL` directly for browser fetches;
 * import from here so a stale env value can never re-introduce the cross-site cookie bug.
 *
 * Localhost dev keeps the env var (`:3001` is the same *site* as `:3000`, so its cookie is
 * first-party). SSR / route handlers (no `window`) also keep the env var — they call the backend
 * server-to-server, where the browser's third-party-cookie policy does not apply.
 */
export function resolveApiBaseUrl(): string {
  if (
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return ''; // production browser → same-origin, first-party cookie
  }
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
}

export const API_BASE_URL = resolveApiBaseUrl();
