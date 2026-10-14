/**
 * SHARED CONTRACT — DUPLICATED BYTE-FOR-BYTE ACROSS BOTH REPOS (ADR-011).
 *
 * THE LIFE OF A DRIVE (PRD §5 "Drive status and lifecycle").
 *
 * The board had five statuses describing whether a posting was open. A placement drive
 * needs twelve describing where the HIRING has got to — a drive can be published, then
 * shortlisting, then interviewing, then at offer stage, and "still open" says nothing
 * useful about any of those.
 *
 * Three rules the PRD states around its table, all of them here rather than scattered
 * through services, because each is a way the lifecycle silently goes wrong:
 *
 *   1. TRANSITIONS ARE VALIDATED. "Status should be configurable by authorised admins,
 *      but the system should validate obvious transitions." A drive cannot go from
 *      Archived back to Draft, and Offer Stage cannot precede Shortlisting. The map below
 *      is deliberately permissive about going BACKWARDS — real hiring reopens a round —
 *      and strict about skipping forwards, because a skipped stage means candidates were
 *      never told about one.
 *
 *   2. THE HISTORY IS PRESERVED. Every move is an event, never an overwrite. A drive's
 *      current status is a fact about today; "when did this go cold, and who paused it"
 *      is the question an employer actually asks three weeks later.
 *
 *   3. COLD IS NOT A DELETE. The PRD is explicit: "'Cold' should not delete or reset
 *      applications." Pausing a drive must leave every application, round outcome and
 *      offer exactly where it was — see the ON_HOLD tests. The same goes for CANCELLED,
 *      which preserves applications and notifies rather than tidying up.
 */

/**
 * Where a drive has got to. Twelve of these are the PRD's own rows; CLOSED and COMPLETED
 * are kept apart (the PRD groups them as one row) because the platform already told
 * students different things — "no longer accepting applications" vs "this role has been
 * filled" — and collapsing them would lose a distinction students read.
 */
export enum DriveStatus {
  /** Created but not approved/published. */
  DRAFT = 'DRAFT',
  /** Waiting for required ZSkillup/college approval. */
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  /** Required fields and rules complete. */
  READY_TO_PUBLISH = 'READY_TO_PUBLISH',
  /** Visible to the configured audience and accepting applications. */
  PUBLISHED = 'PUBLISHED',
  /** Paused or inactive. Reason and next review date are captured; may be hidden. */
  ON_HOLD = 'ON_HOLD',
  /** Applications, assessments, shortlisting or hiring rounds are active. */
  IN_PROGRESS = 'IN_PROGRESS',
  /** Application review and candidate selection underway. */
  SHORTLISTING = 'SHORTLISTING',
  /** One or more selection rounds active. */
  INTERVIEWING = 'INTERVIEWING',
  /** Offers being prepared or issued. */
  OFFER_STAGE = 'OFFER_STAGE',
  /** Concluded, not filled from here — still readable so shared links do not dead-end. */
  CLOSED = 'CLOSED',
  /** Concluded and filled; final outcomes recorded. */
  COMPLETED = 'COMPLETED',
  /** Called off. Reason required, applicants notified, applications preserved. */
  CANCELLED = 'CANCELLED',
  /** Read-only historical record. */
  ARCHIVED = 'ARCHIVED',
}

export const DRIVE_STATUS_LABELS: Readonly<Record<DriveStatus, string>> = {
  [DriveStatus.DRAFT]: 'Draft',
  [DriveStatus.PENDING_APPROVAL]: 'Pending approval',
  [DriveStatus.READY_TO_PUBLISH]: 'Ready to publish',
  [DriveStatus.PUBLISHED]: 'Published',
  [DriveStatus.ON_HOLD]: 'On hold',
  [DriveStatus.IN_PROGRESS]: 'In progress',
  [DriveStatus.SHORTLISTING]: 'Shortlisting',
  [DriveStatus.INTERVIEWING]: 'Interviewing',
  [DriveStatus.OFFER_STAGE]: 'Offer stage',
  [DriveStatus.CLOSED]: 'Closed',
  [DriveStatus.COMPLETED]: 'Completed',
  [DriveStatus.CANCELLED]: 'Cancelled',
  [DriveStatus.ARCHIVED]: 'Archived',
};

/**
 * What a student may see.
 *
 * Everything before publication is invisible, because it is not a drive yet. ON_HOLD is
 * deliberately absent — a paused requisition must not leak through a shared link, which
 * was already the board's rule and stays it. ARCHIVED is off the board by definition.
 *
 * CANCELLED IS VISIBLE on purpose: the PRD requires applicants to be notified, and a
 * student told their drive was cancelled who then finds a 404 learns nothing about why.
 */
export const STUDENT_VISIBLE_DRIVE_STATUSES: readonly DriveStatus[] = [
  DriveStatus.PUBLISHED,
  DriveStatus.IN_PROGRESS,
  DriveStatus.SHORTLISTING,
  DriveStatus.INTERVIEWING,
  DriveStatus.OFFER_STAGE,
  DriveStatus.CLOSED,
  DriveStatus.COMPLETED,
  DriveStatus.CANCELLED,
] as const;

/**
 * The statuses that still take NEW applications. Only two: a drive is open, or it has
 * moved on to deciding between the people who already applied. Shortlisting onwards is
 * explicitly not an application window — letting someone apply then would hand them a
 * place in a queue that has already closed.
 */
export const APPLICABLE_DRIVE_STATUSES: readonly DriveStatus[] = [
  DriveStatus.PUBLISHED,
  DriveStatus.IN_PROGRESS,
] as const;

/** Statuses from which nothing further can happen. */
export const TERMINAL_DRIVE_STATUSES: readonly DriveStatus[] = [DriveStatus.ARCHIVED] as const;

/** Statuses whose move must carry a written reason. */
export const REASON_REQUIRED_STATUSES: readonly DriveStatus[] = [
  // "Cancelled — Drive cancelled; reason required and applicants notified."
  DriveStatus.CANCELLED,
  // "Cold / On Hold — reason and next review date should be captured."
  DriveStatus.ON_HOLD,
] as const;

/**
 * Which moves are allowed from each status.
 *
 * Permissive backwards, strict forwards. Hiring genuinely reopens a round — a panel falls
 * through, an employer asks to see five more people — so Interviewing → Shortlisting is a
 * normal Tuesday and the map allows it. Skipping forwards is not: a drive that jumps from
 * Published to Offer Stage has candidates who were never told a round happened.
 */
export const ALLOWED_TRANSITIONS: Readonly<Record<DriveStatus, readonly DriveStatus[]>> = {
  [DriveStatus.DRAFT]: [
    DriveStatus.PENDING_APPROVAL,
    DriveStatus.READY_TO_PUBLISH,
    DriveStatus.CANCELLED,
    DriveStatus.ARCHIVED,
  ],
  [DriveStatus.PENDING_APPROVAL]: [
    DriveStatus.READY_TO_PUBLISH,
    // Sent back by the approver.
    DriveStatus.DRAFT,
    DriveStatus.CANCELLED,
  ],
  [DriveStatus.READY_TO_PUBLISH]: [
    DriveStatus.PUBLISHED,
    DriveStatus.PENDING_APPROVAL,
    DriveStatus.DRAFT,
    DriveStatus.CANCELLED,
  ],
  [DriveStatus.PUBLISHED]: [
    DriveStatus.IN_PROGRESS,
    DriveStatus.ON_HOLD,
    DriveStatus.CLOSED,
    DriveStatus.CANCELLED,
  ],
  [DriveStatus.ON_HOLD]: [
    // Resuming returns it to whichever stage it was paused in; the caller picks.
    DriveStatus.PUBLISHED,
    DriveStatus.IN_PROGRESS,
    DriveStatus.SHORTLISTING,
    DriveStatus.INTERVIEWING,
    DriveStatus.OFFER_STAGE,
    DriveStatus.CLOSED,
    DriveStatus.CANCELLED,
  ],
  [DriveStatus.IN_PROGRESS]: [
    DriveStatus.SHORTLISTING,
    DriveStatus.ON_HOLD,
    DriveStatus.CLOSED,
    DriveStatus.CANCELLED,
  ],
  [DriveStatus.SHORTLISTING]: [
    DriveStatus.INTERVIEWING,
    DriveStatus.IN_PROGRESS,
    DriveStatus.ON_HOLD,
    DriveStatus.CLOSED,
    DriveStatus.CANCELLED,
  ],
  [DriveStatus.INTERVIEWING]: [
    DriveStatus.OFFER_STAGE,
    DriveStatus.SHORTLISTING,
    DriveStatus.ON_HOLD,
    DriveStatus.CLOSED,
    DriveStatus.CANCELLED,
  ],
  [DriveStatus.OFFER_STAGE]: [
    DriveStatus.COMPLETED,
    DriveStatus.INTERVIEWING,
    DriveStatus.ON_HOLD,
    DriveStatus.CLOSED,
    DriveStatus.CANCELLED,
  ],
  [DriveStatus.CLOSED]: [
    DriveStatus.COMPLETED,
    // Reopened — an employer comes back for one more hire.
    DriveStatus.IN_PROGRESS,
    DriveStatus.ARCHIVED,
  ],
  [DriveStatus.COMPLETED]: [DriveStatus.CLOSED, DriveStatus.ARCHIVED],
  [DriveStatus.CANCELLED]: [
    // Revived as a draft; the old applications stay attached to their history.
    DriveStatus.DRAFT,
    DriveStatus.ARCHIVED,
  ],
  // "Read-only historical record."
  [DriveStatus.ARCHIVED]: [],
};

export interface TransitionRequest {
  from: DriveStatus;
  to: DriveStatus;
  reason?: string | null;
  /** Required alongside a reason when going ON_HOLD — the PRD asks for a review date. */
  nextReviewDate?: string | null;
}

export interface TransitionProblem {
  code: 'SAME_STATUS' | 'NOT_ALLOWED' | 'TERMINAL' | 'REASON_REQUIRED';
  message: string;
}

/** True when `to` is reachable from `from`. */
export function canTransition(from: DriveStatus, to: DriveStatus): boolean {
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}

/**
 * Why a move is refused, or null when it is fine. Returns the reason rather than a
 * boolean so the API can say "a cancelled drive needs a reason" instead of "invalid".
 */
export function checkTransition(req: TransitionRequest): TransitionProblem | null {
  const fromLabel = DRIVE_STATUS_LABELS[req.from] ?? req.from;
  const toLabel = DRIVE_STATUS_LABELS[req.to] ?? req.to;

  if (req.from === req.to) {
    return { code: 'SAME_STATUS', message: `This drive is already ${toLabel.toLowerCase()}.` };
  }
  if (TERMINAL_DRIVE_STATUSES.includes(req.from)) {
    return {
      code: 'TERMINAL',
      message: `${fromLabel} is a read-only historical record and cannot be changed.`,
    };
  }
  if (!canTransition(req.from, req.to)) {
    return {
      code: 'NOT_ALLOWED',
      message: `A drive cannot go from ${fromLabel.toLowerCase()} to ${toLabel.toLowerCase()}.`,
    };
  }
  if (REASON_REQUIRED_STATUSES.includes(req.to) && !(req.reason ?? '').trim()) {
    return {
      code: 'REASON_REQUIRED',
      message: `Moving a drive to ${toLabel.toLowerCase()} needs a reason.`,
    };
  }
  return null;
}

/** Can students see a drive in this status at all? */
export function isStudentVisible(status: DriveStatus): boolean {
  return STUDENT_VISIBLE_DRIVE_STATUSES.includes(status);
}

/** Does this status still accept NEW applications? */
export function acceptsApplications(status: DriveStatus): boolean {
  return APPLICABLE_DRIVE_STATUSES.includes(status);
}

/**
 * The statuses an admin may move to from here, for a dropdown that cannot offer an
 * impossible choice. Ordered as the lifecycle runs, so the menu reads forwards.
 */
export function nextStatuses(from: DriveStatus): DriveStatus[] {
  const order = Object.values(DriveStatus);
  return [...(ALLOWED_TRANSITIONS[from] ?? [])].sort(
    (a, b) => order.indexOf(a) - order.indexOf(b),
  );
}
