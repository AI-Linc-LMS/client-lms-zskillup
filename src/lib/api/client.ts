import { authToken } from '@/store/auth';
import { hasPreviewHint, roleHint } from '@/lib/session-hints';
import { ApiRequestError, type ApiResponse } from './types';

/**
 * The single channel to the backend (CLAUDE.md §5/§6). No component or page may
 * `fetch` the backend directly — everything goes through here so token attach,
 * the 401→refresh→retry-once flow, and error normalization live in ONE place.
 *
 * Auth model (ADR-006 / DATA_FLOW §2). Each request has THREE auth postures:
 *
 *   - default          : retry once on 401 via /api/auth/refresh; on second
 *                        failure clear all session state and redirect to /login.
 *   - `auth: 'login'`  : 401 means BAD CREDENTIALS — surface as ApiRequestError;
 *                        do NOT attempt refresh; do NOT redirect. Used by every
 *                        auth-token-establishing endpoint (login, register,
 *                        verify-email, refresh, forgot-password, reset-password).
 *   - `auth: 'public'` : best-effort guest call. 401 surfaces as
 *                        ApiRequestError; no refresh; no redirect. Used by
 *                        public catalog reads so a logged-out visitor never
 *                        gets thrown into a refresh loop.
 *
 * The QA audit (run wevz997ec) showed the previous "always retry, always
 * redirect on a second 401" rule was the root cause of multiple production-
 * grade bugs: an infinite `/me` polling loop on first paint, silent login
 * failures (state nuked by the redirect), and a `/practice` 403 being masked
 * by a forced /login bounce. This file is the single fix for all of them.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type AuthPosture = 'default' | 'login' | 'public';

type RequestOptions = Omit<RequestInit, 'body'> & {
  /** JSON-serializable body; set automatically with the JSON content-type. */
  json?: unknown;
  /** Multipart body (file uploads). When set, Content-Type is left to the browser. */
  formData?: FormData;
  /** Auth posture — see file header. Defaults to 'default'. */
  auth?: AuthPosture;
};

/**
 * Refresh verdicts are three-way, not boolean: only `unauthorized` is an auth
 * decision. `network` means the refresh endpoint was UNREACHABLE — a transient
 * (backend restart, blip) that must never tear the session down, or a few
 * seconds of downtime would mass-logout every open tab.
 */
type RefreshOutcome = 'ok' | 'unauthorized' | 'network';

let refreshInFlight: Promise<RefreshOutcome> | null = null;
/** Module-level latch — once we've decided this session is dead, stop retrying. */
let sessionTerminated = false;

/**
 * Calls the Next refresh route handler (same-origin) which forwards the
 * HttpOnly refresh cookie to Nest. De-duplicates concurrent refreshes so a
 * burst of 401s triggers EXACTLY ONE refresh.
 */
async function refreshAccessToken(): Promise<RefreshOutcome> {
  if (sessionTerminated) return 'unauthorized';
  if (!refreshInFlight) {
    refreshInFlight = (async (): Promise<RefreshOutcome> => {
      try {
        // Call the backend refresh endpoint DIRECTLY (cross-origin, credentials
        // included) so the browser sends the API-domain refresh cookie. The Next
        // same-origin proxy can't read a cookie scoped to the API's domain.
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!res.ok) return 'unauthorized';
        const body = (await res.json()) as {
          accessToken?: string;
          data?: { accessToken?: string };
        };
        const accessToken = body.data?.accessToken ?? body.accessToken;
        if (!accessToken) return 'unauthorized';
        authToken.set(accessToken);
        return 'ok';
      } catch {
        // fetch() rejects only on network failure — the server never answered,
        // so we have NO verdict on the session. Surface as transient.
        return 'network';
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

/**
 * Tear the session down fully and bounce to /login. Clears the in-memory
 * access token AND the non-HttpOnly UX-hint cookies (`role`, `onboarded`).
 * Without clearing the hint cookies the Next.js middleware sees an
 * "authenticated" user and bounces /login → /dashboard, restarting the loop.
 */
function endSessionAndRedirect(): void {
  if (typeof window === 'undefined') return;
  if (sessionTerminated) return; // single-shot
  sessionTerminated = true;
  authToken.clear();
  document.cookie = 'role=; path=/; max-age=0; samesite=lax';
  document.cookie = 'onboarded=; path=/; max-age=0; samesite=lax';
  // The refresh cookie is HttpOnly — only the logout route handler can clear
  // it. A dead-but-present cookie makes the middleware treat the visitor as
  // authenticated and bounce /login → /dashboard → 401 → /login in an endless
  // navigation loop (each cycle is a fresh bundle, so no in-memory latch can
  // stop it). Purge it server-side, then hard-navigate — which also wipes all
  // in-flight component state so queued effects can't restart the loop.
  void fetch(`${API_BASE_URL}/api/v1/auth/logout`, { method: 'POST', credentials: 'include' })
    .catch(() => {})
    .finally(() => window.location.assign('/login'));
}

/**
 * "View as student" restore (single channel, like refresh). The preview token
 * is memory-only, so a hard refresh during a super-admin preview drops it while
 * the `preview=student` hint cookie survives. Restoring it HERE — before any
 * request leaves on a student-area page — guarantees no component ever hits a
 * STUDENT-only endpoint with the admin token (which would 403 "Insufficient
 * role"). The restorer is registered by lib/preview-actions to avoid an import
 * cycle; restoration is single-flight like refresh.
 */
let previewRestorer: (() => Promise<void>) | null = null;
let previewRestoreInFlight: Promise<void> | null = null;

export function _setPreviewRestorer(fn: () => Promise<void>): void {
  previewRestorer = fn;
}

function previewRestorePending(path: string): boolean {
  if (typeof window === 'undefined') return false;
  if (authToken.isPreview()) return false;
  // The restore call itself must go out with the ADMIN token.
  if (path === '/api/v1/admin/impersonate') return false;
  if (!hasPreviewHint() || roleHint() !== 'SUPER_ADMIN') return false;
  // Only student-area pages run as the student; consoles keep the admin token.
  const page = window.location.pathname;
  if (page.startsWith('/superadmin') || page.startsWith('/admin') || page.startsWith('/tpo'))
    return false;
  return true;
}

async function ensureStudentPreview(path: string): Promise<void> {
  if (!previewRestorer || !previewRestorePending(path)) return;
  if (!previewRestoreInFlight) {
    previewRestoreInFlight = previewRestorer()
      .catch(() => {
        // Admin session dead or preview no longer allowed — drop the stale hint
        // so requests proceed (and fail/redirect) through the normal auth flow.
        document.cookie = 'preview=; path=/; max-age=0; samesite=lax';
      })
      .finally(() => {
        previewRestoreInFlight = null;
      });
  }
  return previewRestoreInFlight;
}

async function parseError(res: Response): Promise<ApiRequestError> {
  try {
    const body = (await res.json()) as { error?: Record<string, unknown> };
    return new ApiRequestError(res.status, body.error ?? {});
  } catch {
    return new ApiRequestError(res.status, {});
  }
}

async function rawRequest<T>(path: string, options: RequestOptions): Promise<ApiResponse<T>> {
  const { json, formData, headers, auth: _auth, ...rest } = options;
  void _auth;
  const token = authToken.get();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      Accept: 'application/json',
      // For multipart (formData) let the browser set Content-Type + boundary.
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(json !== undefined ? { body: JSON.stringify(json) } : formData !== undefined ? { body: formData } : {}),
    // 'include' so the backend Set-Cookie (zskillup_refresh HttpOnly) is
    // accepted on login/logout and sent on subsequent same-site requests.
    credentials: 'include',
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  if (res.status === 204) {
    return { data: undefined as T };
  }
  return (await res.json()) as ApiResponse<T>;
}

/**
 * Make an API request. Handles the 401 refresh-and-retry-once flow.
 *
 * `path` is relative to the API base (e.g. `/api/v1/auth/login`).
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const posture: AuthPosture = options.auth ?? 'default';

  // Restore an interrupted "view as student" preview before the request leaves.
  await ensureStudentPreview(path);

  // Prime the access token before the FIRST attempt. On a hard navigation /
  // full reload the in-memory token is gone, but an authenticated session is
  // still valid (HttpOnly refresh cookie + the `role` hint cookie is present).
  // Refreshing up-front turns the otherwise-guaranteed first-paint 401 burst
  // (every authenticated call 401ing before the retry path kicks in) into a
  // single silent refresh. Skipped for login/public/preview postures and for
  // logged-out visitors (no role hint). Single-flight via refreshAccessToken,
  // so a burst of concurrent calls all await ONE refresh.
  if (
    posture === 'default' &&
    !sessionTerminated &&
    !authToken.isPreview() &&
    authToken.get() == null &&
    roleHint() !== null
  ) {
    await refreshAccessToken();
  }

  try {
    return await rawRequest<T>(path, options);
  } catch (err) {
    if (!(err instanceof ApiRequestError)) throw err;

    // 403 is "you are who you say you are, but you can't have this." NEVER
    // retry or redirect on 403 — surface to caller so the UI can show an
    // empty/forbidden state instead of bouncing.
    if (err.status === 403) throw err;

    // 401 handling depends on posture.
    if (err.status === 401) {
      // login/register/verify/forgot/reset: 401 == bad credentials. Surface.
      if (posture === 'login') throw err;

      // public reads: 401 just means "no session" — no refresh, no redirect.
      if (posture === 'public') throw err;

      // Preview mode (super-admin "view as student"): the short-lived student
      // token cannot be refreshed — refreshing would silently swap back to the
      // admin session and corrupt the preview. Surface the 401 to the caller.
      if (authToken.isPreview()) throw err;

      // default: try a single silent refresh, then retry once.
      if (sessionTerminated) throw err;
      const refreshed = await refreshAccessToken();
      if (refreshed === 'ok') {
        try {
          return await rawRequest<T>(path, options);
        } catch (retryErr) {
          if (retryErr instanceof ApiRequestError && retryErr.status === 401) {
            endSessionAndRedirect();
          }
          throw retryErr;
        }
      }
      // Transient outage — surface the failure to the caller's error state and
      // keep the session; the next user action retries against a live backend.
      if (refreshed === 'network') throw err;
      endSessionAndRedirect();
    }

    throw err;
  }
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, json?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'POST', json }),
  postForm: <T>(path: string, formData: FormData, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'POST', formData }),
  patch: <T>(path: string, json?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', json }),
  delete: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
};

/**
 * Test-only escape hatch. After a successful logout from the client, components
 * navigate (router.push('/')) and the page state is rebuilt — but the
 * `sessionTerminated` latch above persists for the lifetime of the JS bundle.
 * Call this on a fresh login to re-arm the client. The session itself is
 * authoritative on the server; this flag is purely a circuit-breaker.
 */
export function _rearmApiClient(): void {
  sessionTerminated = false;
  refreshInFlight = null;
}
