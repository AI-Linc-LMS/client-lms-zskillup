/**
 * SHARED CONTRACT — DUPLICATED BYTE-FOR-BYTE ACROSS BOTH REPOS (ADR-011).
 *
 * SEARCHING, SORTING AND ACTING ON CANDIDATES IN BULK (PRD §15).
 *
 * Four decisions here, each of them a way a candidate list quietly misleads the person
 * reading it:
 *
 *   1. UNKNOWN SORTS LAST IN BOTH DIRECTIONS. Most match scores on this platform are null
 *      — coverage of mock interview data is under 1% and academic marks do not exist at
 *      all. If null sorted as zero, then "worst match first" would hand an operator a page
 *      of students about whom NOTHING IS KNOWN and present them as the weakest candidates
 *      in the cohort. Unmeasured is not bad. It sorts to the end whichever way the column
 *      is pointed, and the row says why.
 *
 *   2. A SAVED VIEW IS A NAMED QUESTION, NOT A STORED FILTER STRING. §15 names five of
 *      them — "eligible and unplaced", "high match but not applied", "applied and not
 *      reviewed", "shortlisted awaiting HR", "offer issued awaiting response". Each is a
 *      question a placement officer asks every week, so each is defined once here and
 *      reads identically on every screen, rather than being reassembled out of filter
 *      chips slightly differently by each caller.
 *
 *   3. A BULK ACTION IS CHECKED AGAINST WHAT THE OPERATOR SAW. §15 asks for bulk actions
 *      that are "permission-controlled and confirmation-protected". The dangerous case is
 *      not a missing dialog: it is a filtered list that CHANGED between the operator
 *      ticking "select all" and the request arriving — somebody else shortlists two more
 *      people and now the reject applies to a set the operator never looked at. So every
 *      bulk request carries the count the operator saw, and is refused if the resolved set
 *      differs. This is the same guarantee as git's --force-with-lease.
 *
 *   4. A BULK RESULT NAMES EVERY FAILURE. Reporting "38 of 41 updated" tells an operator
 *      that three people need chasing without telling them which three, so nobody chases
 *      them. The same rule §12 applies to round invites.
 */

import { MatchDimension } from './drive-matching';

/** What a candidate list can be ordered by (PRD §15). */
export enum CandidateSortKey {
  OVERALL_SCORE = 'OVERALL_SCORE',
  APTITUDE = 'APTITUDE',
  TECHNICAL = 'TECHNICAL',
  COMMUNICATION = 'COMMUNICATION',
  RESUME_FIT = 'RESUME_FIT',
  INTERVIEW_READINESS = 'INTERVIEW_READINESS',
  PLACEMENT_READINESS = 'PLACEMENT_READINESS',
  /** §15 lists academic marks. The platform holds none; the key exists so the column can
   *  say so rather than silently falling back to another order. */
  ACADEMIC_MARKS = 'ACADEMIC_MARKS',
  LAST_ACTIVITY = 'LAST_ACTIVITY',
  APPLICATION_DATE = 'APPLICATION_DATE',
  CTC = 'CTC',
  NAME = 'NAME',
  COVERAGE = 'COVERAGE',
}

export const SORT_LABELS: Readonly<Record<CandidateSortKey, string>> = {
  [CandidateSortKey.OVERALL_SCORE]: 'Overall match',
  [CandidateSortKey.APTITUDE]: 'Aptitude',
  [CandidateSortKey.TECHNICAL]: 'Technical',
  [CandidateSortKey.COMMUNICATION]: 'Communication',
  [CandidateSortKey.RESUME_FIT]: 'Resume fit',
  [CandidateSortKey.INTERVIEW_READINESS]: 'Interview readiness',
  [CandidateSortKey.PLACEMENT_READINESS]: 'Placement readiness',
  [CandidateSortKey.ACADEMIC_MARKS]: 'Academic marks',
  [CandidateSortKey.LAST_ACTIVITY]: 'Last activity',
  [CandidateSortKey.APPLICATION_DATE]: 'Application date',
  [CandidateSortKey.CTC]: 'Best offer (CTC)',
  [CandidateSortKey.NAME]: 'Name',
  [CandidateSortKey.COVERAGE]: 'Data coverage',
};

/** Sort keys that read a §6 match dimension, so one mapping serves the lot. */
export const SORT_KEY_DIMENSION: Partial<Record<CandidateSortKey, MatchDimension>> = {
  [CandidateSortKey.APTITUDE]: MatchDimension.APTITUDE,
  [CandidateSortKey.TECHNICAL]: MatchDimension.TECHNICAL,
  [CandidateSortKey.COMMUNICATION]: MatchDimension.COMMUNICATION,
  [CandidateSortKey.RESUME_FIT]: MatchDimension.RESUME,
  [CandidateSortKey.INTERVIEW_READINESS]: MatchDimension.INTERVIEW_READINESS,
  [CandidateSortKey.PLACEMENT_READINESS]: MatchDimension.PLACEMENT_READINESS,
};

/**
 * Sort keys the platform cannot order by, with the reason.
 *
 * §15 asks for sorting by academic marks. No 10th, 12th, graduation, CGPA or backlog data
 * exists anywhere in the schema. Offering the control and quietly ordering by something
 * else would be worse than not offering it, so the key is accepted and refused by name.
 */
export const UNAVAILABLE_SORTS: Partial<Record<CandidateSortKey, string>> = {
  [CandidateSortKey.ACADEMIC_MARKS]:
    'The platform holds no academic marks — no 10th, 12th, graduation, CGPA or backlog data is collected anywhere yet.',
};

export type SortDirection = 'asc' | 'desc';

/** The §15 filter set. Every field is optional; absent means "do not narrow on this". */
export interface CandidateFilter {
  search?: string | null;
  /** Hard eligibility (§4): pass, fail, or could not be judged. */
  eligibility?: 'ELIGIBLE' | 'INELIGIBLE' | 'NEEDS_REVIEW' | null;
  minScore?: number | null;
  maxScore?: number | null;
  /** Minimum share of the drive's weight that was measurable, 0–100 (§6). */
  minCoverage?: number | null;
  /** Per-dimension floors, e.g. { TECHNICAL: 60 }. */
  minDimension?: Partial<Record<MatchDimension, number>> | null;
  skills?: string[] | null;
  location?: string | null;
  collegeId?: string | null;
  cohort?: string | null;
  department?: string | null;
  paidAccess?: boolean | null;
  placementStatus?: string[] | null;
  applicationStatus?: string[] | null;
  /** True keeps only those who have applied; false only those who have not. */
  hasApplied?: boolean | null;
  /** ISO date — keeps candidates active on or after it. */
  activeSince?: string | null;
  ctcMin?: number | null;
  ctcMax?: number | null;
  /** Answers to the drive's own questions: questionId → expected value, matched loosely. */
  answers?: Record<string, string> | null;
}

/** The minimum a row needs to be searched, sorted and bulk-acted on. */
export interface SearchableCandidate {
  userId: string;
  fullName: string | null;
  email: string;
  collegeName: string | null;
  collegeId?: string | null;
  cohort: string | null;
  branch: string | null;
  location?: string | null;
  skills?: string[] | null;
  paidAccess: boolean;
  eligible: boolean;
  /** True when eligibility could not be decided — absent data, not a failure (§4). */
  needsReview: boolean;
  score: number | null;
  coverage: number;
  dimensionScores?: Partial<Record<MatchDimension, number | null>> | null;
  applicationStatus: string | null;
  appliedAt: string | null;
  placementStatus: string | null;
  bestOfferCtc: number | null;
  lastActivityAt: string | null;
  answers?: Record<string, string> | null;
  /** §17: share of the measured weight whose evidence is older than STALE_AFTER_DAYS. */
  staleWeightPct?: number;
  /** Age in days of the oldest measurement behind the score. Null when unmeasured. */
  oldestEvidenceAgeDays?: number | null;
}

/* ------------------------------------------------------------------------- */
/* Filtering                                                                  */
/* ------------------------------------------------------------------------- */

export function matchesFilter(c: SearchableCandidate, f: CandidateFilter): boolean {
  if (f.search?.trim()) {
    const q = f.search.trim().toLowerCase();
    const hay = [c.fullName, c.email, c.collegeName, c.branch, c.cohort]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }

  if (f.eligibility) {
    if (f.eligibility === 'ELIGIBLE' && !(c.eligible && !c.needsReview)) return false;
    if (f.eligibility === 'INELIGIBLE' && (c.eligible || c.needsReview)) return false;
    if (f.eligibility === 'NEEDS_REVIEW' && !c.needsReview) return false;
  }

  // A score filter EXCLUDES the unscored rather than treating them as zero. An operator
  // asking for "60 and above" is asking about people they can judge; answering with
  // students about whom nothing is known would be a different answer to a different
  // question. The unscored are found with minCoverage instead, which is explicit.
  if (f.minScore != null) {
    if (c.score === null || c.score < f.minScore) return false;
  }
  if (f.maxScore != null) {
    if (c.score === null || c.score > f.maxScore) return false;
  }
  if (f.minCoverage != null && c.coverage < f.minCoverage) return false;

  if (f.minDimension) {
    for (const [dim, min] of Object.entries(f.minDimension)) {
      if (min == null) continue;
      const v = c.dimensionScores?.[dim as MatchDimension];
      if (v === null || v === undefined || v < min) return false;
    }
  }

  if (f.skills?.length) {
    const have = new Set((c.skills ?? []).map((s) => s.toLowerCase().trim()));
    // ANY, not ALL: a drive listing eight skills would otherwise match nobody.
    if (!f.skills.some((s) => have.has(s.toLowerCase().trim()))) return false;
  }

  if (f.location?.trim()) {
    if (!(c.location ?? '').toLowerCase().includes(f.location.trim().toLowerCase())) return false;
  }
  if (f.collegeId && c.collegeId !== f.collegeId) return false;
  if (f.cohort && c.cohort !== f.cohort) return false;
  if (f.department && c.branch !== f.department) return false;
  if (f.paidAccess != null && c.paidAccess !== f.paidAccess) return false;

  if (f.placementStatus?.length) {
    if (!c.placementStatus || !f.placementStatus.includes(c.placementStatus)) return false;
  }
  if (f.applicationStatus?.length) {
    if (!c.applicationStatus || !f.applicationStatus.includes(c.applicationStatus)) return false;
  }
  if (f.hasApplied != null) {
    if (f.hasApplied !== (c.applicationStatus !== null)) return false;
  }

  if (f.activeSince) {
    if (!c.lastActivityAt || c.lastActivityAt < f.activeSince) return false;
  }

  if (f.ctcMin != null) {
    if (c.bestOfferCtc === null || c.bestOfferCtc < f.ctcMin) return false;
  }
  if (f.ctcMax != null) {
    if (c.bestOfferCtc === null || c.bestOfferCtc > f.ctcMax) return false;
  }

  if (f.answers) {
    for (const [qid, expected] of Object.entries(f.answers)) {
      const given = c.answers?.[qid];
      if (given === undefined) return false;
      if (!String(given).toLowerCase().includes(String(expected).toLowerCase())) return false;
    }
  }

  return true;
}

/* ------------------------------------------------------------------------- */
/* Sorting                                                                    */
/* ------------------------------------------------------------------------- */

function sortValue(c: SearchableCandidate, key: CandidateSortKey): number | string | null {
  const dim = SORT_KEY_DIMENSION[key];
  if (dim) return c.dimensionScores?.[dim] ?? null;
  switch (key) {
    case CandidateSortKey.OVERALL_SCORE: return c.score;
    case CandidateSortKey.COVERAGE: return c.coverage;
    case CandidateSortKey.LAST_ACTIVITY: return c.lastActivityAt;
    case CandidateSortKey.APPLICATION_DATE: return c.appliedAt;
    case CandidateSortKey.CTC: return c.bestOfferCtc;
    case CandidateSortKey.NAME: return c.fullName ?? c.email;
    case CandidateSortKey.ACADEMIC_MARKS: return null;
    default: return null;
  }
}

/**
 * Order a candidate list.
 *
 * NULLS GO LAST IN BOTH DIRECTIONS. This is the rule that matters. Most match scores here
 * are null, and sorting ascending with nulls first would present the students about whom
 * nothing is known as the weakest in the cohort — the precise misreading §6 was built to
 * prevent, reintroduced through a table header. Unmeasured is not worst, so it leaves the
 * ranking rather than being placed within it.
 */
export function sortCandidates(
  rows: readonly SearchableCandidate[],
  key: CandidateSortKey,
  dir: SortDirection = 'desc',
): SearchableCandidate[] {
  const out = [...rows];
  out.sort((a, b) => {
    const va = sortValue(a, key);
    const vb = sortValue(b, key);
    const aNull = va === null || va === undefined || va === '';
    const bNull = vb === null || vb === undefined || vb === '';
    if (aNull && bNull) return (a.fullName ?? a.email).localeCompare(b.fullName ?? b.email);
    if (aNull) return 1;
    if (bNull) return -1;
    let cmp: number;
    if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
    else cmp = String(va).localeCompare(String(vb));
    return dir === 'asc' ? cmp : -cmp;
  });
  return out;
}

/* ------------------------------------------------------------------------- */
/* Saved views                                                                */
/* ------------------------------------------------------------------------- */

/** The five views §15 names, plus two the same reasoning produces. */
export enum SavedView {
  ELIGIBLE_AND_UNPLACED = 'ELIGIBLE_AND_UNPLACED',
  HIGH_MATCH_NOT_APPLIED = 'HIGH_MATCH_NOT_APPLIED',
  APPLIED_NOT_REVIEWED = 'APPLIED_NOT_REVIEWED',
  SHORTLISTED_AWAITING_HR = 'SHORTLISTED_AWAITING_HR',
  OFFER_AWAITING_RESPONSE = 'OFFER_AWAITING_RESPONSE',
  /** Not in §15's list, but the same question the platform's data actually raises. */
  NEEDS_DATA = 'NEEDS_DATA',
  BLOCKED_BY_PAID_ACCESS = 'BLOCKED_BY_PAID_ACCESS',
}

export interface SavedViewDef {
  key: SavedView;
  label: string;
  /** What the view is for, in the words an operator would use. */
  description: string;
  filter: CandidateFilter;
  sort: { key: CandidateSortKey; dir: SortDirection };
}

/** `HIGH_MATCH` threshold. Matches §6's READY_AT so one screen cannot call 70 "high"
 *  while another calls it "developing". */
export const HIGH_MATCH_AT = 70;

export const SAVED_VIEWS: Readonly<Record<SavedView, SavedViewDef>> = {
  [SavedView.ELIGIBLE_AND_UNPLACED]: {
    key: SavedView.ELIGIBLE_AND_UNPLACED,
    label: 'Eligible and unplaced',
    description: 'Students who meet this drive’s rules and are not yet placed.',
    filter: { eligibility: 'ELIGIBLE', placementStatus: ['UNPLACED', 'IN_PROCESS'] },
    sort: { key: CandidateSortKey.OVERALL_SCORE, dir: 'desc' },
  },
  [SavedView.HIGH_MATCH_NOT_APPLIED]: {
    key: SavedView.HIGH_MATCH_NOT_APPLIED,
    label: 'High match but not applied',
    description:
      'Strong fits who have not applied — usually a visibility or deadline problem, not a willingness one.',
    filter: { minScore: HIGH_MATCH_AT, hasApplied: false },
    sort: { key: CandidateSortKey.OVERALL_SCORE, dir: 'desc' },
  },
  [SavedView.APPLIED_NOT_REVIEWED]: {
    key: SavedView.APPLIED_NOT_REVIEWED,
    label: 'Applied and not reviewed',
    description: 'Applications nobody has read yet. The queue that makes students wait.',
    filter: { applicationStatus: ['APPLIED', 'SUBMITTED'] },
    sort: { key: CandidateSortKey.APPLICATION_DATE, dir: 'asc' },
  },
  [SavedView.SHORTLISTED_AWAITING_HR]: {
    key: SavedView.SHORTLISTED_AWAITING_HR,
    label: 'Shortlisted awaiting HR',
    description: 'Shortlisted and not yet sent to the employer.',
    filter: { applicationStatus: ['SHORTLISTED'] },
    sort: { key: CandidateSortKey.OVERALL_SCORE, dir: 'desc' },
  },
  [SavedView.OFFER_AWAITING_RESPONSE]: {
    key: SavedView.OFFER_AWAITING_RESPONSE,
    label: 'Offer issued awaiting response',
    description: 'Offers out and unanswered — the window where candidates are lost quietly.',
    filter: { applicationStatus: ['OFFER_ISSUED'] },
    sort: { key: CandidateSortKey.APPLICATION_DATE, dir: 'asc' },
  },
  [SavedView.NEEDS_DATA]: {
    key: SavedView.NEEDS_DATA,
    label: 'Cannot be judged yet',
    description:
      'Candidates with too little data to score or to decide eligibility on. On this platform this is the largest group, and it is a data problem rather than a candidate problem.',
    filter: { eligibility: 'NEEDS_REVIEW' },
    sort: { key: CandidateSortKey.COVERAGE, dir: 'asc' },
  },
  [SavedView.BLOCKED_BY_PAID_ACCESS]: {
    key: SavedView.BLOCKED_BY_PAID_ACCESS,
    label: 'Eligible but cannot apply',
    description:
      'Students who meet the rules but hold no live access, so the apply button is closed to them.',
    filter: { eligibility: 'ELIGIBLE', paidAccess: false },
    sort: { key: CandidateSortKey.OVERALL_SCORE, dir: 'desc' },
  },
};

/* ------------------------------------------------------------------------- */
/* Pagination                                                                 */
/* ------------------------------------------------------------------------- */

export const MAX_PAGE_SIZE = 200;
export const DEFAULT_PAGE_SIZE = 50;

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  /** True when more rows exist past this page — so a UI need not compare arithmetic. */
  hasMore: boolean;
}

export function paginate<T>(rows: readonly T[], limit?: number | null, offset?: number | null): Page<T> {
  const lim = Math.min(Math.max(1, limit ?? DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
  const off = Math.max(0, offset ?? 0);
  return {
    items: rows.slice(off, off + lim),
    total: rows.length,
    limit: lim,
    offset: off,
    hasMore: off + lim < rows.length,
  };
}

/* ------------------------------------------------------------------------- */
/* Bulk actions                                                               */
/* ------------------------------------------------------------------------- */

/** The bulk actions §15 lists, verbatim. */
export enum BulkAction {
  INVITE = 'INVITE',
  MARK_ELIGIBLE = 'MARK_ELIGIBLE',
  MARK_INELIGIBLE = 'MARK_INELIGIBLE',
  SHORTLIST = 'SHORTLIST',
  REJECT = 'REJECT',
  MOVE_STAGE = 'MOVE_STAGE',
  SCHEDULE_ASSESSMENT = 'SCHEDULE_ASSESSMENT',
  SEND_NOTIFICATION = 'SEND_NOTIFICATION',
  EXPORT = 'EXPORT',
  ASSIGN_OWNER = 'ASSIGN_OWNER',
  ARCHIVE = 'ARCHIVE',
}

export const BULK_ACTION_LABELS: Readonly<Record<BulkAction, string>> = {
  [BulkAction.INVITE]: 'Invite to this drive',
  [BulkAction.MARK_ELIGIBLE]: 'Mark eligible',
  [BulkAction.MARK_INELIGIBLE]: 'Mark ineligible',
  [BulkAction.SHORTLIST]: 'Shortlist',
  [BulkAction.REJECT]: 'Reject',
  [BulkAction.MOVE_STAGE]: 'Move to stage',
  [BulkAction.SCHEDULE_ASSESSMENT]: 'Invite to an assessment',
  [BulkAction.SEND_NOTIFICATION]: 'Send a notification',
  [BulkAction.EXPORT]: 'Export',
  [BulkAction.ASSIGN_OWNER]: 'Assign an owner',
  [BulkAction.ARCHIVE]: 'Archive',
};

/**
 * Actions a candidate will see, hear about, or be judged by — so they need a written
 * reason. The same rule as §10, applied to the path where it is easiest to skip: doing it
 * to forty people at once is exactly when nobody types an explanation.
 */
export const BULK_REASON_REQUIRED: readonly BulkAction[] = [
  BulkAction.REJECT,
  BulkAction.MARK_INELIGIBLE,
  BulkAction.ARCHIVE,
] as const;

/** Actions that tell the candidate something, and so cannot be quietly undone. */
export const BULK_NOTIFIES_CANDIDATE: readonly BulkAction[] = [
  BulkAction.INVITE,
  BulkAction.SHORTLIST,
  BulkAction.REJECT,
  BulkAction.MOVE_STAGE,
  BulkAction.SCHEDULE_ASSESSMENT,
  BulkAction.SEND_NOTIFICATION,
] as const;

export interface BulkRequest {
  action: BulkAction;
  candidateIds: string[];
  reason?: string | null;
  /** For MOVE_STAGE. */
  toStage?: string | null;
  /** Which of the drive's planned rounds. Required for SCHEDULE_ASSESSMENT. */
  roundId?: string | null;
  /** Informational: the round already names its assessment (§12). */
  scheduledAssessmentId?: string | null;
  /** For ASSIGN_OWNER. */
  ownerUserId?: string | null;
  /**
   * How many candidates the operator believed they were acting on.
   *
   * The guard that matters. A filtered list can change between "select all" and the
   * request arriving — somebody else shortlists two more people, and now a bulk reject
   * covers a set the operator never looked at. Mismatch is refused rather than applied.
   */
  expectedCount?: number | null;
}

export interface BulkProblem {
  code:
    | 'NOTHING_SELECTED'
    | 'TOO_MANY'
    | 'REASON_REQUIRED'
    | 'STAGE_REQUIRED'
    | 'ASSESSMENT_REQUIRED'
    | 'OWNER_REQUIRED'
    | 'SELECTION_CHANGED';
  message: string;
}

/** Nobody should be able to act on ten thousand people in one request by accident. */
export const MAX_BULK_SIZE = 500;

export function checkBulkRequest(req: BulkRequest): BulkProblem | null {
  const ids = [...new Set(req.candidateIds ?? [])];
  if (ids.length === 0) {
    return { code: 'NOTHING_SELECTED', message: 'Select at least one candidate first.' };
  }
  if (ids.length > MAX_BULK_SIZE) {
    return {
      code: 'TOO_MANY',
      message: `This would affect ${ids.length} candidates. Act on at most ${MAX_BULK_SIZE} at a time.`,
    };
  }

  // The --force-with-lease check: what the operator saw must be what is about to happen.
  if (req.expectedCount != null && req.expectedCount !== ids.length) {
    return {
      code: 'SELECTION_CHANGED',
      message: `This list has changed since you selected it — you chose ${req.expectedCount} candidates and this request covers ${ids.length}. Reload and check before continuing.`,
    };
  }

  if (BULK_REASON_REQUIRED.includes(req.action) && !(req.reason ?? '').trim()) {
    return {
      code: 'REASON_REQUIRED',
      message: `${BULK_ACTION_LABELS[req.action]} needs a reason — every candidate will be told, and asked about it later.`,
    };
  }
  if (req.action === BulkAction.MOVE_STAGE && !req.toStage) {
    return { code: 'STAGE_REQUIRED', message: 'Say which stage they are moving to.' };
  }
  // §12 made the ROUND the carrier of an assessment — it holds the link, the panel and
  // the capacity — so inviting people to an assessment means inviting them to a round.
  // Accepting a bare assessment id would be accepting a field nothing could act on.
  if (req.action === BulkAction.SCHEDULE_ASSESSMENT && !req.roundId) {
    return {
      code: 'ASSESSMENT_REQUIRED',
      message: 'Pick which round of this drive they are being invited to.',
    };
  }
  if (req.action === BulkAction.ASSIGN_OWNER && !req.ownerUserId) {
    return { code: 'OWNER_REQUIRED', message: 'Pick who is taking this on.' };
  }
  return null;
}

/**
 * The result of a bulk action.
 *
 * EVERY FAILURE IS NAMED. "38 of 41 updated" tells an operator that three people need
 * chasing without telling them which three, so nobody chases them. The same rule §12
 * applies to round invites, for the same reason.
 */
export interface BulkResult {
  action: BulkAction;
  applied: Array<{ candidateId: string; name: string | null }>;
  skipped: Array<{ candidateId: string; name: string | null; reason: string }>;
  /** Present so a UI need not count arrays; the arrays remain the source of truth. */
  appliedCount: number;
  skippedCount: number;
  /** §12 warns rather than enforces round capacity — the warning survives the bulk path
   *  or an operator overshoots a lab and never hears about it. */
  capacityWarning?: string;
}
