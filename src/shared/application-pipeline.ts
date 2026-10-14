/**
 * SHARED CONTRACT — DUPLICATED BYTE-FOR-BYTE ACROSS BOTH REPOS (ADR-011).
 *
 * THE APPLICATION PIPELINE (PRD §10).
 *
 * Where one candidate has got to in one drive. The drive's own lifecycle (§5) says where
 * the HIRING is; this says where a PERSON is, and the two move independently — a drive
 * can be at Offer Stage while most of its candidates are long since rejected.
 *
 * Four rules, each of them a way a pipeline quietly harms somebody:
 *
 *   1. NOTHING IS OVERWRITTEN. "Preserve previous status, actor, timestamp and reason."
 *      A status is a fact about today; "who rejected me, when, and why" is the question
 *      a student actually asks, and an UPDATE cannot answer it. Every move is an event.
 *
 *   2. MOVING BACKWARDS IS ALLOWED, AND MEANT. "Candidates should be movable forward/
 *      backward only by authorised users." A panel falls through, an employer asks to see
 *      five more people, a rejection turns out to be a mix-up — §18 requires a rejected
 *      candidate to be re-enterable "with history preserved". A pipeline that only goes
 *      one way forces staff to delete and re-create, which destroys exactly the history
 *      this section exists to keep.
 *
 *   3. A REJECTION CARRIES A REASON. Not because the system needs it, but because the
 *      student will ask and the person who decided will not remember in six weeks.
 *
 *   4. ROUND STAGES POINT AT THE DRIVE'S OWN ROUNDS. §4 defined the planned rounds and
 *      their vocabulary; a candidate "in Round 2" means the drive's second planned round,
 *      not a number this file invents. That is why a round event carries `roundId`.
 */

/** Where one candidate stands in one drive. Mirrors §10's stage table. */
export enum ApplicationStage {
  APPLIED = 'APPLIED',
  /** Being read — profile, score, eligibility, answers. */
  UNDER_REVIEW = 'UNDER_REVIEW',
  /** Read, and something is missing before a decision can be made. */
  NEEDS_INFO = 'NEEDS_INFO',
  SHORTLISTED = 'SHORTLISTED',
  /** Held — not rejected, not progressed. The honest state for "maybe later". */
  ON_HOLD = 'ON_HOLD',
  ASSESSMENT_INVITED = 'ASSESSMENT_INVITED',
  ASSESSMENT_COMPLETED = 'ASSESSMENT_COMPLETED',
  /** Sent to the employer — recorded because §13 needs to know what was shared, when. */
  SHARED_WITH_EMPLOYER = 'SHARED_WITH_EMPLOYER',
  /** The employer picked them out of what was shared. */
  EMPLOYER_SHORTLISTED = 'EMPLOYER_SHORTLISTED',
  /** In one of the drive's planned rounds — which one is on the event's `roundId`. */
  IN_ROUND = 'IN_ROUND',
  SELECTED = 'SELECTED',
  WAITLISTED = 'WAITLISTED',
  REJECTED = 'REJECTED',
  OFFER_ISSUED = 'OFFER_ISSUED',
  OFFER_ACCEPTED = 'OFFER_ACCEPTED',
  OFFER_DECLINED = 'OFFER_DECLINED',
  OFFER_EXPIRED = 'OFFER_EXPIRED',
  JOINED = 'JOINED',
  DID_NOT_JOIN = 'DID_NOT_JOIN',
  /** The student pulled out. */
  WITHDRAWN = 'WITHDRAWN',
  /** Did not turn up to a round. */
  NO_SHOW = 'NO_SHOW',
}

export const STAGE_LABELS: Readonly<Record<ApplicationStage, string>> = {
  [ApplicationStage.APPLIED]: 'Applied',
  [ApplicationStage.UNDER_REVIEW]: 'Under review',
  [ApplicationStage.NEEDS_INFO]: 'Needs information',
  [ApplicationStage.SHORTLISTED]: 'Shortlisted',
  [ApplicationStage.ON_HOLD]: 'On hold',
  [ApplicationStage.ASSESSMENT_INVITED]: 'Assessment invited',
  [ApplicationStage.ASSESSMENT_COMPLETED]: 'Assessment completed',
  [ApplicationStage.SHARED_WITH_EMPLOYER]: 'Shared with employer',
  [ApplicationStage.EMPLOYER_SHORTLISTED]: 'Shortlisted by employer',
  [ApplicationStage.IN_ROUND]: 'In a round',
  [ApplicationStage.SELECTED]: 'Selected',
  [ApplicationStage.WAITLISTED]: 'Waitlisted',
  [ApplicationStage.REJECTED]: 'Rejected',
  [ApplicationStage.OFFER_ISSUED]: 'Offer issued',
  [ApplicationStage.OFFER_ACCEPTED]: 'Offer accepted',
  [ApplicationStage.OFFER_DECLINED]: 'Offer declined',
  [ApplicationStage.OFFER_EXPIRED]: 'Offer expired',
  [ApplicationStage.JOINED]: 'Joined',
  [ApplicationStage.DID_NOT_JOIN]: 'Did not join',
  [ApplicationStage.WITHDRAWN]: 'Withdrawn',
  [ApplicationStage.NO_SHOW]: 'No show',
};

/** Stages that end a candidate's run in this drive. */
export const TERMINAL_STAGES: readonly ApplicationStage[] = [
  ApplicationStage.REJECTED,
  ApplicationStage.OFFER_DECLINED,
  ApplicationStage.OFFER_EXPIRED,
  ApplicationStage.JOINED,
  ApplicationStage.DID_NOT_JOIN,
  ApplicationStage.WITHDRAWN,
  ApplicationStage.NO_SHOW,
] as const;

/**
 * Moves that must carry a written reason.
 *
 * Every one of these is something the candidate will ask about, and the person who
 * decided will not remember in six weeks. A rejection with no reason is the single most
 * common complaint about campus hiring, and it costs one text field to fix.
 */
export const REASON_REQUIRED_STAGES: readonly ApplicationStage[] = [
  ApplicationStage.REJECTED,
  ApplicationStage.ON_HOLD,
  ApplicationStage.NEEDS_INFO,
  ApplicationStage.WAITLISTED,
  ApplicationStage.NO_SHOW,
  ApplicationStage.DID_NOT_JOIN,
] as const;

/** Stages the STUDENT may put themselves into. Everything else is staff-only. */
export const STUDENT_SETTABLE_STAGES: readonly ApplicationStage[] = [
  ApplicationStage.WITHDRAWN,
] as const;

export function isTerminal(stage: ApplicationStage): boolean {
  return TERMINAL_STAGES.includes(stage);
}

export function needsReason(stage: ApplicationStage): boolean {
  return REASON_REQUIRED_STAGES.includes(stage);
}

/**
 * Is this move allowed?
 *
 * Deliberately permissive, and that is a decision rather than laziness. §10 asks only
 * that moves be made "by authorised users", and §18 requires a rejected candidate to be
 * re-enterable with history preserved. Real hiring moves sideways and backwards
 * constantly, and a tight graph would force staff to delete and re-create candidates —
 * destroying the history this whole section exists to keep.
 *
 * So the only refusals are the ones that would corrupt the record rather than merely
 * look odd: a move to where the candidate already is, and a move out of JOINED, which is
 * the one outcome that is a fact about the world rather than an opinion about a person.
 */
export interface StageMove {
  from: ApplicationStage;
  to: ApplicationStage;
  reason?: string | null;
  /** Required when moving to IN_ROUND — which of the drive's planned rounds. */
  roundId?: string | null;
  /** True when the student is acting on their own application. */
  byStudent?: boolean;
}

export interface StageProblem {
  code: 'SAME_STAGE' | 'JOINED_IS_FINAL' | 'REASON_REQUIRED' | 'ROUND_REQUIRED' | 'NOT_YOURS';
  message: string;
}

export function checkStageMove(move: StageMove): StageProblem | null {
  const toLabel = STAGE_LABELS[move.to] ?? move.to;

  if (move.from === move.to) {
    return { code: 'SAME_STAGE', message: `This candidate is already ${toLabel.toLowerCase()}.` };
  }

  // A student may withdraw and nothing else. Letting them set any stage would let them
  // mark themselves selected, which is not a theoretical concern on a shared API.
  if (move.byStudent && !STUDENT_SETTABLE_STAGES.includes(move.to)) {
    return { code: 'NOT_YOURS', message: 'Only the placement team can change this.' };
  }

  // Somebody started the job. That is a fact about the world, and a later edit would be
  // rewriting it rather than recording a change of mind.
  if (move.from === ApplicationStage.JOINED) {
    return {
      code: 'JOINED_IS_FINAL',
      message: 'This candidate has already joined — record an offer change instead.',
    };
  }

  if (move.to === ApplicationStage.IN_ROUND && !move.roundId) {
    return { code: 'ROUND_REQUIRED', message: 'Say which round they are going into.' };
  }

  if (needsReason(move.to) && !(move.reason ?? '').trim()) {
    return {
      code: 'REASON_REQUIRED',
      message: `Moving a candidate to ${toLabel.toLowerCase()} needs a reason.`,
    };
  }

  return null;
}

/** Stages offered in a move menu, in pipeline order, minus where they already are. */
export function stageOptions(from: ApplicationStage): ApplicationStage[] {
  if (from === ApplicationStage.JOINED) return [];
  return Object.values(ApplicationStage).filter((s) => s !== from);
}

/**
 * The six-value vocabulary the board shipped with, mapped onto the pipeline — so a row
 * written before §10 reads correctly rather than being treated as unknown.
 */
export const LEGACY_STATUS_MAP: Readonly<Record<string, ApplicationStage>> = {
  SUBMITTED: ApplicationStage.APPLIED,
  UNDER_REVIEW: ApplicationStage.UNDER_REVIEW,
  SHORTLISTED: ApplicationStage.SHORTLISTED,
  INTERVIEW: ApplicationStage.IN_ROUND,
  HIRED: ApplicationStage.SELECTED,
  REJECTED: ApplicationStage.REJECTED,
};
