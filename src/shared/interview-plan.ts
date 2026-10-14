/**
 * SHARED CONTRACT — DUPLICATED BYTE-FOR-BYTE ACROSS BOTH REPOS (ADR-011).
 *
 * PREPARING FOR A REAL INTERVIEW (PRD §23.6).
 *
 * §23.6 asks for a "role-specific mock interview plan, including competencies, questions,
 * follow-ups, expected evidence and a scoring rubric", assignable as AI-led practice or
 * schedulable as a human-led session.
 *
 * WHAT ALREADY EXISTS, and what it cannot do. The platform has AI mock interviews with
 * turn-by-turn questioning, transcription and AI grading — but they are STUDENT-INITIATED
 * and configured by a free-text topic plus one of three generic types (technical,
 * behavioral, mixed). A student preparing for a specific employer's managerial round
 * cannot say so, and a placement team cannot assign one at all.
 *
 * So this file is the drive's side of an interview: what THIS round, for THIS role, is
 * actually testing. It is deliberately a PLAN rather than a script.
 *
 *   EXPECTED EVIDENCE IS THE INTERESTING FIELD. §23.6 asks for it by name, and it is what
 *   separates a usable rubric from a vague one. "Communicates well" cannot be scored
 *   consistently by two different people; "gives a concrete example with their own role in
 *   it" can. A rubric without evidence criteria produces scores that mean whatever the
 *   scorer was feeling.
 *
 *   FOLLOW-UPS ARE PROMPTS, NOT A TREE. A real interviewer follows the answer. Encoding a
 *   decision tree would either constrain them or be ignored, so each question carries
 *   suggested probes and the interviewer chooses.
 */

import { RoundKind } from './drive-rounds';

/** How the interview is run. */
export enum InterviewMode {
  /** The platform's AI interviewer, assignable to many candidates at once. */
  AI_LED = 'AI_LED',
  /** A person interviews them at a scheduled time. */
  HUMAN_LED = 'HUMAN_LED',
}

export const INTERVIEW_MODE_LABELS: Readonly<Record<InterviewMode, string>> = {
  [InterviewMode.AI_LED]: 'AI-led practice',
  [InterviewMode.HUMAN_LED]: 'Human-led mock interview',
};

/** Where a scheduled human-led session has got to. */
export enum SessionStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  /** The candidate did not attend. Distinct from cancelled — see §18's RSVP reasoning. */
  NO_SHOW = 'NO_SHOW',
  /** Called off by the team or the interviewer. Not the candidate's fault, and not
   *  recorded as though it were. */
  CANCELLED = 'CANCELLED',
  /** The candidate asked to move it (§18.13's reschedule, applied to a panel). */
  RESCHEDULE_REQUESTED = 'RESCHEDULE_REQUESTED',
}

export const SESSION_STATUS_LABELS: Readonly<Record<SessionStatus, string>> = {
  [SessionStatus.SCHEDULED]: 'Scheduled',
  [SessionStatus.COMPLETED]: 'Completed',
  [SessionStatus.NO_SHOW]: 'Did not attend',
  [SessionStatus.CANCELLED]: 'Cancelled by us',
  [SessionStatus.RESCHEDULE_REQUESTED]: 'Reschedule requested',
};

/** One thing the interview is testing, and how to tell whether it is there. */
export interface Competency {
  name: string;
  /**
   * What a good answer actually contains. §23.6's "expected evidence".
   *
   * This is what makes a rubric scoreable by two different people. "Communicates well" is
   * not evidence; "gives a concrete example with their own role in it" is.
   */
  expectedEvidence: string[];
  /** Weight within the interview, 0–100. The set must total 100. */
  weight: number;
}

export interface InterviewQuestionPlan {
  question: string;
  competency: string;
  /** Probes an interviewer may use. Suggestions, not a decision tree — see the header. */
  followUps: string[];
}

export interface InterviewPlan {
  roundKind: RoundKind;
  mode: InterviewMode;
  /** The role this is for, so the questions are about the job rather than generic. */
  role?: string | null;
  competencies: Competency[];
  questions: InterviewQuestionPlan[];
  /** How a scorer should use the competencies. */
  rubric?: string | null;
  durationMinutes?: number | null;
  /** What the candidate is told beforehand. */
  candidateBrief?: string | null;
}

export interface InterviewPlanProblem {
  code: 'NOT_AN_INTERVIEW_ROUND' | 'NO_COMPETENCIES' | 'WEIGHTS' | 'NO_EVIDENCE' | 'ORPHAN_QUESTION';
  message: string;
}

/** Rounds an interview plan makes sense for. */
export const INTERVIEW_ROUNDS: readonly RoundKind[] = [
  RoundKind.TECHNICAL_INTERVIEW,
  RoundKind.MANAGERIAL_INTERVIEW,
  RoundKind.HR_INTERVIEW,
  // A communication round and a GD are scored on the same kind of rubric, so they share
  // the machinery even though nobody would call them interviews.
  RoundKind.COMMUNICATION,
  RoundKind.GROUP_DISCUSSION,
] as const;

export function checkInterviewPlan(plan: InterviewPlan): InterviewPlanProblem | null {
  if (!INTERVIEW_ROUNDS.includes(plan.roundKind)) {
    return {
      code: 'NOT_AN_INTERVIEW_ROUND',
      message: 'An interview plan only applies to an interview, communication or GD round.',
    };
  }
  if (plan.competencies.length === 0) {
    return {
      code: 'NO_COMPETENCIES',
      message: 'Say what the interview is testing before writing the questions.',
    };
  }

  const total = plan.competencies.reduce((t, c) => t + (c.weight ?? 0), 0);
  if (total !== 100) {
    // The same rule as §6's match weights and §23.2's difficulty mix: a set that misses
    // 100 silently rescales every score without telling anybody it did.
    return { code: 'WEIGHTS', message: `The competency weights add up to ${total}%, not 100%.` };
  }

  /**
   * THE RULE THAT MAKES A RUBRIC WORTH HAVING. A competency with no expected evidence
   * cannot be scored consistently by two different people — and §23.6 asks for the
   * evidence by name. Without it the scores mean whatever the scorer was feeling, which
   * is worse than no score because it looks like one.
   */
  const vague = plan.competencies.find((c) => (c.expectedEvidence ?? []).length === 0);
  if (vague) {
    return {
      code: 'NO_EVIDENCE',
      message: `Say what a good answer on "${vague.name}" actually contains — two people cannot score it the same way otherwise.`,
    };
  }

  // A question testing a competency the plan does not list is either a stray or a missing
  // competency, and both are worth catching before an interviewer is confused by it.
  const names = new Set(plan.competencies.map((c) => c.name));
  const orphan = plan.questions.find((q) => !names.has(q.competency));
  if (orphan) {
    return {
      code: 'ORPHAN_QUESTION',
      message: `"${orphan.question.slice(0, 60)}" is marked against "${orphan.competency}", which is not one of this interview's competencies.`,
    };
  }

  return null;
}

/**
 * A starting plan for an interview round, from §23.3's competencies.
 *
 * Weights are spread EVENLY rather than guessed. An uneven default would be an opinion
 * about this role that nobody formed, and the operator would accept it without noticing —
 * whereas an even split is visibly a starting point.
 *
 * Evidence is left EMPTY on purpose, so `checkInterviewPlan` refuses the plan until
 * somebody writes it. That is the one field a template cannot fill honestly: what counts
 * as evidence of "ownership" depends on the role, and a generic sentence would be exactly
 * the vague rubric this is meant to prevent.
 */
export function startingPlan(
  roundKind: RoundKind,
  competencyNames: readonly string[],
  opts: { role?: string | null; durationMinutes?: number | null } = {},
): InterviewPlan {
  const names = competencyNames.length > 0 ? [...competencyNames] : ['Role knowledge'];
  // Spread to exactly 100, with the remainder on the first so the total is never 99.
  const base = Math.floor(100 / names.length);
  const remainder = 100 - base * names.length;
  return {
    roundKind,
    mode: InterviewMode.AI_LED,
    role: opts.role ?? null,
    durationMinutes: opts.durationMinutes ?? null,
    competencies: names.map((name, i) => ({
      name,
      expectedEvidence: [],
      weight: i === 0 ? base + remainder : base,
    })),
    questions: [],
    rubric: null,
    candidateBrief: null,
  };
}

/**
 * Progress across attempts (PRD §23.6).
 *
 * §23.6: "allow students to practise again, and let authorised staff compare progress
 * across attempts WHILE PRESERVING EARLIER SCORES AND FEEDBACK."
 *
 * So this is a list, oldest first, and nothing is ever replaced. `delta` is computed for
 * display and is null on the first attempt and whenever either score is missing — an
 * improvement from an unscored attempt is not an improvement, it is an unknown.
 */
export interface AttemptProgress {
  attemptNumber: number;
  at: string;
  score: number | null;
  /** Per-competency, so "better overall" can be checked against where. */
  competencyScores: Array<{ name: string; score: number | null }>;
  feedback: string | null;
  /** Change from the previous attempt. Null on the first, or if either score is absent. */
  delta: number | null;
}

export function withDeltas(
  attempts: ReadonlyArray<Omit<AttemptProgress, 'delta' | 'attemptNumber'>>,
): AttemptProgress[] {
  return attempts.map((a, i) => {
    const prev = i > 0 ? attempts[i - 1] : null;
    return {
      ...a,
      attemptNumber: i + 1,
      // Null rather than a number whenever either side is unmeasured: an "improvement"
      // measured from nothing is not an improvement.
      delta:
        prev && typeof prev.score === 'number' && typeof a.score === 'number'
          ? Math.round((a.score - prev.score) * 10) / 10
          : null,
    };
  });
}
