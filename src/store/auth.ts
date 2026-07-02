import { create } from 'zustand';

/**
 * Auth store (ADR-006 / frontend/CLAUDE.md §5): the access token lives in MEMORY
 * ONLY. Never persisted to localStorage/sessionStorage/cookie — those are
 * forbidden (XSS exfiltration risk). The refresh token is an HttpOnly cookie the
 * client JS cannot read; it is handled by the Next refresh route handler.
 *
 * Zustand is used ONLY for this token (and, later, the gamification toast queue)
 * — it is not a server-state cache.
 *
 * Preview layer (super-admin "view as student"): a short-lived student access
 * token can be layered ON TOP of the real session token. While a preview is
 * active, `authToken.get()` returns the preview token so every API call runs as
 * the student — but the real `accessToken` (the admin's) is untouched, so
 * exiting the preview is instant. The preview token is also memory-only.
 */
export interface PreviewUser {
  id: string;
  name: string | null;
  role: 'STUDENT' | 'COLLEGE_ADMIN' | 'ADMIN' | 'SUPER_ADMIN';
  isOnboarded: boolean;
}

interface AuthState {
  accessToken: string | null;
  previewToken: string | null;
  previewUser: PreviewUser | null;
  setToken: (token: string) => void;
  clearToken: () => void;
  startPreview: (token: string, user: PreviewUser) => void;
  stopPreview: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  previewToken: null,
  previewUser: null,
  setToken: (token) => set({ accessToken: token }),
  // Logout clears everything, including any active preview.
  clearToken: () => set({ accessToken: null, previewToken: null, previewUser: null }),
  startPreview: (token, user) => set({ previewToken: token, previewUser: user }),
  stopPreview: () => set({ previewToken: null, previewUser: null }),
}));

/** Non-React accessors so the API client (outside the component tree) can read/write the token. */
export const authToken = {
  /** Preview token wins when a preview is active, so all calls run as the student. */
  get: (): string | null => {
    const s = useAuthStore.getState();
    return s.previewToken ?? s.accessToken;
  },
  set: (token: string): void => useAuthStore.getState().setToken(token),
  clear: (): void => useAuthStore.getState().clearToken(),
  /** True while a super-admin is previewing the student view. */
  isPreview: (): boolean => useAuthStore.getState().previewToken !== null,
  startPreview: (token: string, user: PreviewUser): void =>
    useAuthStore.getState().startPreview(token, user),
  stopPreview: (): void => useAuthStore.getState().stopPreview(),
};
