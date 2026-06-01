import { authToken } from '@/store/auth';
import { ApiRequestError, type ApiResponse } from './types';

/**
 * The single channel to the backend (frontend/CLAUDE.md §5/§6). No component or
 * page may `fetch` the backend directly — everything goes through here so token
 * attach, the 401→refresh→retry-once flow, and error normalization live in ONE
 * place.
 *
 * Auth model (ADR-006 / DATA_FLOW §2):
 *  - Attaches the in-memory access token as `Authorization: Bearer …`.
 *  - On 401: calls the Next route handler `/api/auth/refresh` (which forwards the
 *    HttpOnly refresh cookie to Nest), stores the new access token, retries the
 *    original request ONCE.
 *  - On a second 401: clears the token and redirects to /login.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type RequestOptions = Omit<RequestInit, 'body'> & {
  /** JSON-serializable body; set automatically with the JSON content-type. */
  json?: unknown;
};

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Calls the Next refresh route handler (same-origin) which forwards the HttpOnly
 * cookie to Nest. De-duplicates concurrent refreshes so a burst of 401s triggers
 * exactly one refresh. Returns true if a new access token was obtained.
 */
async function refreshAccessToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch('/api/auth/refresh', { method: 'POST' });
        if (!res.ok) return false;
        const body = (await res.json()) as { accessToken?: string };
        if (!body.accessToken) return false;
        authToken.set(body.accessToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

function redirectToLogin(): void {
  if (typeof window !== 'undefined') {
    window.location.assign('/login');
  }
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
  const { json, headers, ...rest } = options;
  const token = authToken.get();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      Accept: 'application/json',
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
    // Must be 'include' so the backend Set-Cookie (zskillup_refresh HttpOnly) is
    // accepted by the browser on login/logout, and sent on subsequent requests.
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
 * Make an API request. Handles the 401 refresh-and-retry-once flow. `path` is
 * relative to the API base (e.g. `/api/v1/auth/login`).
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  try {
    return await rawRequest<T>(path, options);
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 401) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        try {
          return await rawRequest<T>(path, options);
        } catch (retryErr) {
          if (retryErr instanceof ApiRequestError && retryErr.status === 401) {
            authToken.clear();
            redirectToLogin();
          }
          throw retryErr;
        }
      }
      authToken.clear();
      redirectToLogin();
    }
    throw err;
  }
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, json?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'POST', json }),
  patch: <T>(path: string, json?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', json }),
  delete: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
};
