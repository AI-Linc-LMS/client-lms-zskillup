import type { StatusTone } from '@/components/student/StatusPill';
import { ApplicationStage } from '@/shared/application-pipeline';
import { OfferStatus } from '@/shared/placement-status';
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

/**
 * A HIRING STAGE AS A TONE (§4.11).
 *
 * TOTAL OVER THE ENUM ON PURPOSE. A six-key map against §10's twenty-one stages is what
 * white-screened the applicants page once: `Record<ApplicationStage, …>` makes the
 * compiler refuse the next stage anyone adds until it has been given a colour here.
 *
 * The point of the colour is that it says something true. Rejected, declined and no-show
 * are negative; a live round is informational; selected, accepted and joined are
 * positive; held and waitlisted are a warning rather than a failure. Painting all of them
 * one colour — which this screen did — is the §4.11 defect of a status pill that no
 * longer communicates status.
 */
export const APPLICATION_STAGE_TONE: Readonly<Record<ApplicationStage, StatusTone>> = {
  [ApplicationStage.APPLIED]: 'neutral',
  [ApplicationStage.UNDER_REVIEW]: 'info',
  [ApplicationStage.NEEDS_INFO]: 'warning',
  [ApplicationStage.SHORTLISTED]: 'info',
  [ApplicationStage.ON_HOLD]: 'warning',
  [ApplicationStage.ASSESSMENT_INVITED]: 'info',
  [ApplicationStage.ASSESSMENT_COMPLETED]: 'info',
  [ApplicationStage.SHARED_WITH_EMPLOYER]: 'info',
  [ApplicationStage.EMPLOYER_SHORTLISTED]: 'info',
  [ApplicationStage.IN_ROUND]: 'info',
  [ApplicationStage.SELECTED]: 'positive',
  [ApplicationStage.WAITLISTED]: 'warning',
  [ApplicationStage.REJECTED]: 'negative',
  [ApplicationStage.OFFER_ISSUED]: 'positive',
  [ApplicationStage.OFFER_ACCEPTED]: 'positive',
  [ApplicationStage.OFFER_DECLINED]: 'negative',
  [ApplicationStage.OFFER_EXPIRED]: 'negative',
  [ApplicationStage.JOINED]: 'positive',
  [ApplicationStage.DID_NOT_JOIN]: 'negative',
  [ApplicationStage.WITHDRAWN]: 'neutral',
  [ApplicationStage.NO_SHOW]: 'negative',
};

/**
 * Never throws and never returns undefined.
 *
 * The stage column holds either §10's vocabulary or the six values the board shipped
 * with — the entity says so — so a row read today can carry a string this map has never
 * heard of. An unknown stage renders neutral, which is honest: we do not know what it
 * means, so we do not colour it as though we did.
 */
export function stageTone(stage: string): StatusTone {
  return APPLICATION_STAGE_TONE[stage as ApplicationStage] ?? 'neutral';
}

/**
 * AN OFFER'S STATUS AS A PILL (§4.11) — tone and the words to show.
 *
 * `students.placements.status` holds `OfferStatus`, NOT `ApplicationStage`; mixing the
 * two is what made a student holding an offer read "In process". Rendering the raw enum
 * puts DID_NOT_JOIN on a TPO's screen, so the label is part of the map.
 */
export const OFFER_STATUS_TONE: Readonly<
  Record<OfferStatus, { tone: StatusTone; label: string }>
> = {
  [OfferStatus.OFFERED]: { tone: 'info', label: 'Offered' },
  [OfferStatus.ACCEPTED]: { tone: 'positive', label: 'Accepted' },
  [OfferStatus.JOINED]: { tone: 'positive', label: 'Joined' },
  [OfferStatus.DECLINED]: { tone: 'negative', label: 'Declined' },
  [OfferStatus.DID_NOT_JOIN]: { tone: 'negative', label: 'Did not join' },
  [OfferStatus.RESCINDED]: { tone: 'negative', label: 'Rescinded' },
  [OfferStatus.EXPIRED]: { tone: 'neutral', label: 'Expired' },
};

/** Same contract as `stageTone`: an unrecognised status shows its own text, uncoloured,
 *  rather than disappearing or crashing the row. */
export function offerStatusPill(status: string): { tone: StatusTone; label: string } {
  return OFFER_STATUS_TONE[status as OfferStatus] ?? { tone: 'neutral', label: status };
}
