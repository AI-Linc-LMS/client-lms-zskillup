/**
 * SHARED CONTRACT — DUPLICATED BYTE-FOR-BYTE ACROSS BOTH REPOS (ADR-011).
 *
 * WHO AN ASSESSMENT IS ASSIGNED TO (PRD §23.4).
 *
 * §23.4 lists five audiences: "an entire institution/cohort, a selected group, all
 * eligible candidates for a drive, shortlisted candidates only, or individually selected
 * students." Three of those the platform already had — a scheduled assessment can be
 * scoped by college, cohort or company, and §12 can invite a hand-picked list of
 * applications into a round.
 *
 * What was missing is the two RULE-BASED audiences. "All eligible candidates for this
 * drive" and "shortlisted only" are not lists an operator maintains; they are questions
 * about the drive's current state, and an operator who has to hand-pick them will get it
 * wrong on a cohort of four hundred.
 *
 * THE RULE THAT MATTERS MOST IN §23.4 is about entitlement, and it is unusually direct:
 *
 *   "If paid access is required for a practice or assessment feature, apply the
 *    configured entitlement policy and clearly show the student what is available. DO NOT
 *    SILENTLY BLOCK AN ASSIGNMENT ALREADY PROMISED AS PART OF A COLLEGE PROGRAMME."
 *
 * So an assignment reports who cannot reach it and why, and NEVER quietly drops them from
 * the audience. A silently shortened audience is indistinguishable from a deliberately
 * narrow one — the operator sees a number, assumes it is the cohort, and forty students
 * never hear about an assessment their college paid for.
 */

/** §23.4's five audiences. */
export enum AssignmentAudience {
  /** Every active student at a college. */
  COLLEGE = 'COLLEGE',
  /** One cohort within a college. */
  COHORT = 'COHORT',
  /** Everyone who passes the drive's hard eligibility today (§4). */
  DRIVE_ELIGIBLE = 'DRIVE_ELIGIBLE',
  /** Everyone who has applied to the drive, whatever stage they are at. */
  DRIVE_APPLICANTS = 'DRIVE_APPLICANTS',
  /** Only candidates currently shortlisted or further on (§10). */
  DRIVE_SHORTLISTED = 'DRIVE_SHORTLISTED',
  /** A hand-picked list of students. */
  SELECTED_STUDENTS = 'SELECTED_STUDENTS',
}

export const AUDIENCE_LABELS: Readonly<Record<AssignmentAudience, string>> = {
  [AssignmentAudience.COLLEGE]: 'Everyone at a college',
  [AssignmentAudience.COHORT]: 'One cohort',
  [AssignmentAudience.DRIVE_ELIGIBLE]: 'Everyone eligible for this drive',
  [AssignmentAudience.DRIVE_APPLICANTS]: 'Everyone who applied',
  [AssignmentAudience.DRIVE_SHORTLISTED]: 'Shortlisted candidates only',
  [AssignmentAudience.SELECTED_STUDENTS]: 'Students I pick',
};

/**
 * Descriptions that say what the audience will be AT ASSIGNMENT TIME.
 *
 * The distinction is not pedantry. "Everyone eligible for this drive" is a question about
 * today, and a student who becomes eligible next week is not in an assignment made today.
 * An operator who believes otherwise will not chase the gap.
 */
export const AUDIENCE_DESCRIPTIONS: Readonly<Record<AssignmentAudience, string>> = {
  [AssignmentAudience.COLLEGE]:
    'Every active student at the college, as of when you assign it.',
  [AssignmentAudience.COHORT]: 'Every active student in the cohort, as of when you assign it.',
  [AssignmentAudience.DRIVE_ELIGIBLE]:
    'Everyone who meets the drive’s rules right now. Students who become eligible later will not be added automatically.',
  [AssignmentAudience.DRIVE_APPLICANTS]: 'Everyone who has applied so far, at any stage.',
  [AssignmentAudience.DRIVE_SHORTLISTED]:
    'Candidates shortlisted or further along right now. Anyone shortlisted later will not be added automatically.',
  [AssignmentAudience.SELECTED_STUDENTS]: 'Exactly the students you choose, and nobody else.',
};

/** Audiences that need a drive to resolve against. */
export const DRIVE_SCOPED_AUDIENCES: readonly AssignmentAudience[] = [
  AssignmentAudience.DRIVE_ELIGIBLE,
  AssignmentAudience.DRIVE_APPLICANTS,
  AssignmentAudience.DRIVE_SHORTLISTED,
] as const;

/** Why a student in the audience cannot reach the assignment. */
export enum BlockedReason {
  /** No live entitlement of any kind. */
  NO_ACCESS = 'NO_ACCESS',
  /** Their account is suspended or deleted. */
  INACTIVE_ACCOUNT = 'INACTIVE_ACCOUNT',
}

export const BLOCKED_LABELS: Readonly<Record<BlockedReason, string>> = {
  [BlockedReason.NO_ACCESS]: 'No active plan or college access',
  [BlockedReason.INACTIVE_ACCOUNT]: 'Account is not active',
};

/**
 * A resolved audience.
 *
 * `blocked` is a SEPARATE list rather than an absence from `recipients`, and that is the
 * whole design. §23.4: "do not silently block an assignment already promised as part of a
 * college programme." A silently shortened audience is indistinguishable from a
 * deliberately narrow one.
 */
export interface ResolvedAudience {
  audience: AssignmentAudience;
  label: string;
  /** Students who will receive the assignment. */
  recipients: Array<{ userId: string; name: string | null; email: string }>;
  /** Students in the audience who cannot reach it, with the reason. NAMED, not counted. */
  blocked: Array<{ userId: string; name: string | null; email: string; reason: BlockedReason }>;
  /** Everyone the audience matched, before access was considered. */
  matched: number;
}

export interface AudienceProblem {
  code: 'DRIVE_REQUIRED' | 'COLLEGE_REQUIRED' | 'COHORT_REQUIRED' | 'NO_STUDENTS_PICKED' | 'EMPTY_AUDIENCE';
  message: string;
}

/** What each audience needs before it can be resolved. */
export function checkAudience(input: {
  audience: AssignmentAudience;
  driveId?: string | null;
  collegeId?: string | null;
  cohortId?: string | null;
  userIds?: string[] | null;
}): AudienceProblem | null {
  if (DRIVE_SCOPED_AUDIENCES.includes(input.audience) && !input.driveId) {
    return { code: 'DRIVE_REQUIRED', message: 'Say which drive these candidates come from.' };
  }
  if (input.audience === AssignmentAudience.COLLEGE && !input.collegeId) {
    return { code: 'COLLEGE_REQUIRED', message: 'Pick the college.' };
  }
  if (input.audience === AssignmentAudience.COHORT && !input.cohortId) {
    return { code: 'COHORT_REQUIRED', message: 'Pick the cohort.' };
  }
  if (
    input.audience === AssignmentAudience.SELECTED_STUDENTS &&
    (input.userIds ?? []).length === 0
  ) {
    return { code: 'NO_STUDENTS_PICKED', message: 'Pick at least one student.' };
  }
  return null;
}

/**
 * How an assignment's progress reads (PRD §23.4, §23.5).
 *
 * §23.5 asks participation to show "assigned count; not started; started;
 * submitted/completed; overdue; absent/no attempt; completion percentage; last activity".
 *
 * NOT-STARTED AND OVERDUE ARE DIFFERENT FACTS and are counted separately. A student who
 * has not started an assessment that closes next week needs a reminder; one who never
 * started an assessment that closed yesterday needs a conversation. Collapsing them into
 * "incomplete" loses the only distinction that changes what anybody does.
 */
export interface AssignmentProgress {
  assigned: number;
  notStarted: number;
  inProgress: number;
  submitted: number;
  /** Not started AND the window has closed — the people who missed it. */
  missed: number;
  /** Null when nobody was assigned: 0/0 is not 0% (§14). */
  completionPct: number | null;
  lastActivityAt: string | null;
}

export function completionOf(p: Omit<AssignmentProgress, 'completionPct'>): number | null {
  // The same rule as §14's rates: an empty denominator is "no data", never zero percent.
  if (p.assigned <= 0) return null;
  return Math.round((p.submitted / p.assigned) * 1000) / 10;
}
