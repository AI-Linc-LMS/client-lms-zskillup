import type { StatusTone } from '@/components/student/StatusPill';
import type {
  AccessLabel,
  AdminActiveEntitlement,
  AdminRole,
  AdminUserStatus,
  LoginMethod,
  PaidStatus,
} from '@/lib/api/admin';

/**
 * Canonical accent maps (frontend/CLAUDE §4.8/§4.11) - ONE definition each so
 * a difficulty or category can never render two different treatments.
 */

/** Difficulty as inline pill classes (quiz/practice surfaces - §4.11 ring style). */
export const DIFFICULTY_RING: Record<string, string> = {
  EASY: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  MEDIUM: 'bg-amber-50 text-amber-700 ring-amber-200',
  HARD: 'bg-red-50 text-red-700 ring-red-200',
};

/** Difficulty as a `<StatusPill tone label>` pair (tables/cards). */
export const DIFFICULTY_TONE: Record<string, { tone: StatusTone; label: string }> = {
  EASY: { tone: 'positive', label: 'Easy' },
  MEDIUM: { tone: 'info', label: 'Medium' },
  HARD: { tone: 'warning', label: 'Hard' },
  BEGINNER: { tone: 'positive', label: 'Beginner' },
  INTERMEDIATE: { tone: 'info', label: 'Intermediate' },
  ADVANCED: { tone: 'warning', label: 'Advanced' },
};

/** Course-category display labels (catalog surfaces). */
export const CATEGORY_LABEL: Record<string, string> = {
  APTITUDE: 'Aptitude',
  PROGRAMMING_DSA: 'Programming · DSA',
  COMMUNICATION_HR: 'Communication · HR',
  MOCK_DRIVE: 'Mock drive',
};

// --- Admin user surfaces (users consoles, detail drawer, user sheet, exports) ---

/** Role display labels. */
export const ADMIN_ROLE_LABEL: Record<AdminRole, string> = {
  STUDENT: 'Student',
  COLLEGE_ADMIN: 'College Admin',
  ADMIN: 'Admin',
  SUPER_ADMIN: 'Super Admin',
};

/** Account status as a `<StatusPill tone label>` pair (§4.11: invited = pending). */
export const USER_STATUS_TONE: Record<AdminUserStatus, { tone: StatusTone; label: string }> = {
  ACTIVE: { tone: 'positive', label: 'Active' },
  INVITED: { tone: 'neutral', label: 'Invited' },
  SUSPENDED: { tone: 'negative', label: 'Suspended' },
};

/** Paid status as a `<StatusPill tone label>` pair: paid is the positive state, unpaid neutral. */
export const PAID_STATUS_TONE: Record<PaidStatus, { tone: StatusTone; label: string }> = {
  PAID: { tone: 'positive', label: 'Paid' },
  UNPAID: { tone: 'neutral', label: 'Unpaid' },
};

/** Why an unpaid student still has access. */
export const ACCESS_LABEL_TEXT: Record<AccessLabel, string> = {
  COLLEGE_ACCESS: 'College access',
  COMPLIMENTARY: 'Complimentary',
};

/** Sign-in method labels for the login history ('otp' is the emailed code). */
export const LOGIN_METHOD_LABEL: Record<LoginMethod, string> = {
  password: 'Password',
  google: 'Google',
  otp: 'Email code',
};

/** Label for a login-history method, falling back to the raw value for an unknown one. */
export function loginMethodLabel(method: string | null): string | null {
  if (!method) return null;
  return LOGIN_METHOD_LABEL[method as LoginMethod] ?? method;
}

/** Entitlement source labels (detail drawer grant summary). */
export const ENTITLEMENT_SOURCE_LABEL: Record<AdminActiveEntitlement['source'], string> = {
  PURCHASE: 'Purchase',
  ADMIN_GRANT: 'Admin grant',
  TRIAL: 'Trial',
  COLLEGE_INHERITED: 'College',
};
