import { apiClient } from './client';

/**
 * Identity API client (`GET /api/v1/me`). Returns the authenticated user with
 * role-specific extras. Used by the dashboard hero, sidebar, and top bar.
 *
 * Architecture (fixes the QA-audit polling-loop bug):
 *
 *   1. We DO NOT call /me if the client-side `role` cookie is missing. That
 *      cookie is set by the login flow as a UX hint and cleared on logout —
 *      its absence means the user is not authenticated, so /me would 401.
 *
 *   2. The actual fetch is dedup'd at module scope so a page that mounts
 *      multiple consumers (e.g. DashboardHero + AvatarMenu) makes one network
 *      call, not many.
 *
 *   3. Each component that consumes /me is responsible for calling getMe()
 *      from a `useEffect(..., [])` (empty deps) so it fires once per mount,
 *      and silently no-ops on rejection. The component never triggers a
 *      retry loop — if /me fails, the component renders the fallback
 *      (demo identity).
 *
 *   4. The request uses `auth: 'public'` posture so a 401 surfaces as an
 *      ApiRequestError and does NOT cascade into a session-tear-down.
 */

export interface ApiStudentProfile {
  collegeId: string | null;
  collegeName: string | null;
  passoutYear: number | null;
  branch: 'CSE' | 'IT' | 'ECE' | 'EEE' | 'MECH' | 'CIVIL' | 'OTHER' | null;
  rollNumber: string | null;
  isOnboarded: boolean;
}

export interface ApiMe {
  id: string;
  email: string;
  fullName: string | null;
  role: 'STUDENT' | 'COLLEGE_ADMIN' | 'SUPER_ADMIN';
  status: 'INVITED' | 'ACTIVE' | 'SUSPENDED';
  isEmailVerified: boolean;
  collegeId: string | null;
  studentProfile: ApiStudentProfile | null;
}

/** Returns true when a session is hinted (login set the role cookie). */
function hasSessionHint(): boolean {
  if (typeof document === 'undefined') return false;
  return /(^|;\s*)role=/.test(document.cookie);
}

/** Module-scope dedup. Cleared on resolve/reject so the next mount re-fetches. */
let inFlight: Promise<ApiMe> | null = null;

export async function getMe(): Promise<ApiMe> {
  if (!hasSessionHint()) {
    throw new Error('no-session');
  }
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const res = await apiClient.get<ApiMe>('/api/v1/me', { auth: 'public' });
      return res.data;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}
