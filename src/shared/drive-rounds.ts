/**
 * SHARED CONTRACT — DUPLICATED BYTE-FOR-BYTE ACROSS BOTH REPOS (ADR-011).
 *
 * THE ROUNDS A DRIVE PLANS TO RUN (PRD §4 "Drive operations → planned rounds").
 *
 * This is the PLAN, not the record. A planned round says "there will be a coding round,
 * probably in the first week of November, at the campus lab". What actually happened to
 * a given candidate in that round is a separate, append-only history (PRD §10), and the
 * practice assessment generated for it is a third thing again (PRD §23). Keeping the
 * three apart is deliberate: a plan gets edited, a candidate's history must never be.
 *
 * The round KIND is defined here rather than in §10 or §23 because all three need the
 * same vocabulary — §10 moves candidates through these rounds, and §23 generates practice
 * for them. One list, so a "coding round" means the same thing in the drive form, the
 * pipeline board and the assessment generator.
 */

/** The kinds of round a placement drive runs. Mirrors PRD §10 and §23.3. */
export enum RoundKind {
  APTITUDE = 'APTITUDE',
  TECHNICAL_MCQ = 'TECHNICAL_MCQ',
  CODING = 'CODING',
  CASE_STUDY = 'CASE_STUDY',
  COMMUNICATION = 'COMMUNICATION',
  GROUP_DISCUSSION = 'GROUP_DISCUSSION',
  TECHNICAL_INTERVIEW = 'TECHNICAL_INTERVIEW',
  MANAGERIAL_INTERVIEW = 'MANAGERIAL_INTERVIEW',
  HR_INTERVIEW = 'HR_INTERVIEW',
  DOCUMENT_VERIFICATION = 'DOCUMENT_VERIFICATION',
  MEDICAL = 'MEDICAL',
  /** Employer-defined. `name` carries what they call it. */
  OTHER = 'OTHER',
}

export const ROUND_KIND_LABELS: Readonly<Record<RoundKind, string>> = {
  [RoundKind.APTITUDE]: 'Aptitude',
  [RoundKind.TECHNICAL_MCQ]: 'Technical MCQ',
  [RoundKind.CODING]: 'Coding',
  [RoundKind.CASE_STUDY]: 'Case study',
  [RoundKind.COMMUNICATION]: 'Communication',
  [RoundKind.GROUP_DISCUSSION]: 'Group discussion',
  [RoundKind.TECHNICAL_INTERVIEW]: 'Technical interview',
  [RoundKind.MANAGERIAL_INTERVIEW]: 'Managerial interview',
  [RoundKind.HR_INTERVIEW]: 'HR interview',
  [RoundKind.DOCUMENT_VERIFICATION]: 'Document verification',
  [RoundKind.MEDICAL]: 'Medical',
  [RoundKind.OTHER]: 'Other',
};

/** One round a drive intends to run. */
export interface PlannedRound {
  /** Stable id, so a candidate's history can point at a round that was later renamed. */
  id: string;
  kind: RoundKind;
  /** What the employer calls it. Falls back to the kind's label when blank. */
  name?: string | null;
  /** 1-based order. Two rounds may share a number when they run in parallel. */
  sequence: number;
  /** Expected date before it is fixed. ISO date (YYYY-MM-DD). */
  tentativeDate?: string | null;
  /** Confirmed date, once known. Supersedes the tentative one in every display. */
  finalDate?: string | null;
  /** Physical venue, when the round is on campus or at the employer. */
  venue?: string | null;
  /** Video link, when it is remote. A round can legitimately have both. */
  meetingLink?: string | null;
  durationMinutes?: number | null;
  /** Shown to candidates invited to this round. */
  instructions?: string | null;
  /** Staff-only. */
  notes?: string | null;
  /** True when this round is run on Prephasz rather than by the employer — it is then
   *  eligible for a generated practice/screening assessment (PRD §23). */
  isPrephaszHosted?: boolean;

  /* ── PRD §12: the assessment behind this round ──────────────────────────── */

  /**
   * An existing Prephasz scheduled assessment this round is run with.
   *
   * A LINK, not a copy. The assessment keeps its own window, duration, proctoring and
   * grading — §12 says "select an existing Prephasz assessment", and duplicating its
   * settings here would create a second source of truth that drifts the first time
   * somebody edits one of them.
   */
  scheduledAssessmentId?: string | null;

  /** An employer-run assessment on their own platform. Mutually exclusive in practice
   *  with the above, but not enforced: a drive may genuinely run both and compare. */
  externalAssessmentUrl?: string | null;

  /** Whether this round's result counts toward selection, or is practice only. §23.4
   *  asks for the distinction to be visible to students and staff; a practice round that
   *  silently gated progression would be the worst of both. */
  isEvaluative?: boolean;

  /** Score needed to pass, when the round has one. Null = no automatic threshold, which
   *  is the safer default: §6 forbids an opaque score deciding alone. */
  passMark?: number | null;

  /** Who is running it — panel, interviewer, or the team. */
  panel?: string | null;

  /** How many candidates this round can take. Null = no cap. */
  capacity?: number | null;
}

/** The round's display name: the employer's wording, else the kind. */
export function roundLabel(round: Pick<PlannedRound, 'kind' | 'name'>): string {
  const custom = (round.name ?? '').trim();
  return custom || ROUND_KIND_LABELS[round.kind] || 'Round';
}

/** The date a round will actually happen on — confirmed beats expected. */
export function roundDate(round: PlannedRound): string | null {
  return round.finalDate || round.tentativeDate || null;
}

/** Plan order: by sequence, then by the date we have, then by name — always stable. */
export function sortRounds(rounds: readonly PlannedRound[]): PlannedRound[] {
  return [...rounds].sort(
    (a, b) =>
      a.sequence - b.sequence ||
      (roundDate(a) ?? '').localeCompare(roundDate(b) ?? '') ||
      roundLabel(a).localeCompare(roundLabel(b)),
  );
}

/**
 * Problems with a planned round list — empty when sound. Checked before a drive saves,
 * so the pipeline in §10 can trust the plan it is built from.
 */
export function validatePlannedRounds(rounds: readonly PlannedRound[]): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const r of rounds) {
    const name = roundLabel(r);
    if (!r.id?.trim()) problems.push(`${name}: round is missing its id`);
    else if (ids.has(r.id)) problems.push(`${name}: duplicate round id`);
    ids.add(r.id);

    if (!Number.isInteger(r.sequence) || r.sequence < 1) {
      problems.push(`${name}: order must be a whole number from 1`);
    }
    if (r.kind === RoundKind.OTHER && !(r.name ?? '').trim()) {
      problems.push('A custom round needs a name');
    }
    if (r.durationMinutes != null && (!Number.isFinite(r.durationMinutes) || r.durationMinutes <= 0)) {
      problems.push(`${name}: duration must be more than zero`);
    }
    for (const [field, value] of [
      ['tentative date', r.tentativeDate],
      ['final date', r.finalDate],
    ] as const) {
      if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        problems.push(`${name}: ${field} must be a date`);
      }
    }
  }
  return problems;
}

/* ------------------------------------------------------------------------- */
/* Can the candidate make it? (PRD §18.13)                                    */
/* ------------------------------------------------------------------------- */

/**
 * A candidate's answer to being put in a round.
 *
 * §18: "a student cannot attend a round: allow RSVP, decline/reschedule request and
 * reason capture." Before this, a student whose university exam clashed with an interview
 * slot had two options: not turn up and be recorded as a NO_SHOW, or email somebody and
 * hope. NO_SHOW is a judgement that follows a candidate around, and it is the wrong one
 * for a person who told us in advance.
 *
 * DECLINING IS NOT WITHDRAWING. A student who cannot make Tuesday has not pulled out of
 * the drive, and conflating the two would end their candidacy over a diary clash. The
 * RSVP is information for whoever is scheduling; §10 still owns every stage change, and a
 * student may not set their own stage beyond withdrawing.
 */
export enum RoundRsvpResponse {
  ATTENDING = 'ATTENDING',
  /** Cannot attend this round at all. Not a withdrawal from the drive. */
  DECLINED = 'DECLINED',
  /** Cannot attend as scheduled, and is asking for another time. */
  RESCHEDULE_REQUESTED = 'RESCHEDULE_REQUESTED',
}

export const RSVP_LABELS: Readonly<Record<RoundRsvpResponse, string>> = {
  [RoundRsvpResponse.ATTENDING]: 'Attending',
  [RoundRsvpResponse.DECLINED]: 'Cannot attend',
  [RoundRsvpResponse.RESCHEDULE_REQUESTED]: 'Asked to reschedule',
};

/**
 * Responses that need the student to say why.
 *
 * Not bureaucracy: whoever reschedules the round has to decide between "I have a
 * university exam" and "I have another offer", and those lead to different actions. A
 * decline with no reason tends to be read as the second.
 */
export const RSVP_REASON_REQUIRED: readonly RoundRsvpResponse[] = [
  RoundRsvpResponse.DECLINED,
  RoundRsvpResponse.RESCHEDULE_REQUESTED,
] as const;

export interface RsvpProblem {
  code: 'REASON_REQUIRED' | 'UNKNOWN_ROUND';
  message: string;
}

export function checkRsvp(input: {
  response: RoundRsvpResponse;
  reason?: string | null;
  /** The drive's planned rounds, so an RSVP cannot name a round that does not exist. */
  rounds: readonly PlannedRound[];
  roundId: string;
}): RsvpProblem | null {
  if (!input.rounds.some((r) => r.id === input.roundId)) {
    return { code: 'UNKNOWN_ROUND', message: 'That round is not part of this drive.' };
  }
  if (RSVP_REASON_REQUIRED.includes(input.response) && !(input.reason ?? '').trim()) {
    return {
      code: 'REASON_REQUIRED',
      message: 'Tell us why, so the team can work around it rather than guess.',
    };
  }
  return null;
}
