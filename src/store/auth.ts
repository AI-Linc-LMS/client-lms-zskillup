import { create } from 'zustand';

/**
 * Auth store (ADR-006 / frontend/CLAUDE.md §5): the access token lives in MEMORY
 * ONLY. Never persisted to localStorage/sessionStorage/cookie — those are
 * forbidden (XSS exfiltration risk). The refresh token is an HttpOnly cookie the
 * client JS cannot read; it is handled by the Next refresh route handler.
 *
 * Zustand is used ONLY for this token (and, later, the gamification toast queue)
 * — it is not a server-state cache.
 */
interface AuthState {
  accessToken: string | null;
  setToken: (token: string) => void;
  clearToken: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  setToken: (token) => set({ accessToken: token }),
  clearToken: () => set({ accessToken: null }),
}));

/** Non-React accessors so the API client (outside the component tree) can read/write the token. */
export const authToken = {
  get: (): string | null => useAuthStore.getState().accessToken,
  set: (token: string): void => useAuthStore.getState().setToken(token),
  clear: (): void => useAuthStore.getState().clearToken(),
};
