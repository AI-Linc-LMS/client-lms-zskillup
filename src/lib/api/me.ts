import { apiClient } from './client';
import { hasRoleHint } from '@/lib/session-hints';
import type { AdminCapabilities } from '@/shared/admin-capabilities';

/**
 * Identity API client (`GET /api/v1/me`). Returns the authenticated user with
 * role-specific extras. Used by the dashboard hero, sidebar, and top bar.
 *
 * Architecture (fixes the QA-audit polling-loop bug, amended 2026-06-11):
 *
 *   1. We DO NOT call /me if the client-side `role` cookie is missing. That
 *      cookie is set by the login flow as a UX hint and cleared on logout —
 *      its absence means the user is not authenticated, so /me would 401.
 *
 *   2. The actual fetch is dedup'd at module scope so a page that mounts
 *      multiple consumers (e.g. DashboardHero + AvatarMenu) makes one network
 *      call, not many.
 *
 *   3. Each component that consumes /me calls getMe() from a
 *      `useEffect(..., [])` (empty deps) so it fires once per mount, and
 *      silently no-ops on rejection — the component renders its fallback.
 *
 *   4. The request uses the DEFAULT posture (silent refresh + retry once).
 *      It originally used `auth: 'public'` to dodge a session-tear-down loop,
 *      but that meant identity NEVER loaded on a hard navigation (the access
 *      token lives in memory, so every fresh bundle's first /me is a 401).
 *      The loop's real causes are fixed at the root now — single-flight
 *      refresh, network-vs-auth refresh verdicts, and HttpOnly-cookie purge
 *      on session teardown — so /me refreshes like every other call.
 */

export interface ApiStudentProfile {
  collegeId: string | null;
  collegeName: string | null;
  passoutYear: number | null;
  branch: 'CSE' | 'IT' | 'ECE' | 'EEE' | 'MECH' | 'CIVIL' | 'OTHER' | null;
  rollNumber: string | null;
  phone: string | null;
  course: string | null;
  yearOfStudy: number | null;
  skills: string[];
  rolesInterested: string[];
  isOnboarded: boolean;
  /** Whether the student has completed the one-time calibration assessment. */
  isCalibrated: boolean;
  /** Whether the student has seen (or dismissed) the platform-guide walkthrough. */
  hasSeenGuide: boolean;
}

/** Patchable profile fields (PATCH /me). */
export interface UpdateMePayload {
  fullName?: string | null;
  phone?: string | null;
  course?: string | null;
  yearOfStudy?: number | null;
  skills?: string[];
  rolesInterested?: string[];
  collegeName?: string | null;
  /** Canonical college (tenancy.colleges.id), picked from the profile dropdown.
   *  This is what actually sets auth.users.college_id — free-text `collegeName`
   *  never did, which is why the "My College" leaderboard had nothing to filter on. */
  collegeId?: string | null;
  passoutYear?: number | null;
}

export interface ApiMe {
  id: string;
  email: string;
  fullName: string | null;
  role: 'STUDENT' | 'COLLEGE_ADMIN' | 'ADMIN' | 'SUPER_ADMIN';
  status: 'INVITED' | 'ACTIVE' | 'SUSPENDED';
  isEmailVerified: boolean;
  collegeId: string | null;
  studentProfile: ApiStudentProfile | null;
  avatarUrl?: string | null;
  /** Effective admin capability flags (SUPER_ADMIN → all; ADMIN → per-account;
   *  others → all false). Present from Phase 2; optional for backward-safety. */
  capabilities?: AdminCapabilities;
}

/** Module-scope dedup. Cleared on resolve/reject so the next mount re-fetches. */
let inFlight: Promise<ApiMe> | null = null;

export async function getMe(): Promise<ApiMe> {
  if (!hasRoleHint()) {
    throw new Error('no-session');
  }
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const res = await apiClient.get<ApiMe>('/api/v1/me');
      return res.data;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** Patch the authenticated user's profile (name + student-profile fields). */
export async function updateMe(patch: UpdateMePayload): Promise<ApiMe> {
  const res = await apiClient.patch<ApiMe>('/api/v1/me', patch);
  return res.data;
}
