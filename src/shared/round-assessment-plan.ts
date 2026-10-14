/**
 * SHARED CONTRACT — DUPLICATED BYTE-FOR-BYTE ACROSS BOTH REPOS (ADR-011).
 *
 * HOW A ROUND'S PRACTICE GETS AUTHORED (PRD §23.2, §23.8).
 *
 * §23.2 asks for three creation modes, and §23.8 asks that the choice be "available at
 * both drive level and individual-round level". This file is that choice and its settings.
 *
 * WHAT THIS DELIBERATELY DOES NOT REBUILD. §23 says to "reuse Prephasz assessment, coding,
 * mock interview and learning capabilities wherever they already exist", and most of §23.2
 * already exists:
 *
 *   - MANUAL authoring is the assessment builder: question banks, sampling with duplicate
 *     control, coding problems, preview, edit, duplicate-for-another-cohort.
 *   - AI AUTHORING is the question-generation service, which writes `source =
 *     'AI_GENERATED'` so §23.2's "clearly identify AI-generated items" is already true.
 *   - §23.2's DRAFT-UNTIL-APPROVED default is already enforced, by a mechanism worth
 *     knowing about: an unverified AI-generated question is excluded from every graded
 *     assessment by the sampling filter, and stays usable only in practice. `verified` IS
 *     the approval step. A parallel draft workflow here would be a second gate that
 *     disagrees with the first.
 *
 * So what was missing is not authoring — it is the RECORD OF THE DECISION: which mode this
 * round's practice was authored in, against which settings, by whom, and what it was
 * before. Without that, "regenerate this round's assessment" has nothing to regenerate
 * from, and §23.8's "store the generation inputs ... so the assessment can be reproduced"
 * is unanswerable.
 */

import { RoundKind } from './drive-rounds';

/** §23.2's three modes. */
export enum AuthoringMode {
  /** Generated from the JD, role, skills, seniority and round, then reviewed. */
  AI = 'AI',
  /** Built by hand from the existing banks and tools. */
  MANUAL = 'MANUAL',
  /** Generated, then added to, edited, reordered or replaced by a person. */
  HYBRID = 'HYBRID',
}

export const AUTHORING_MODE_LABELS: Readonly<Record<AuthoringMode, string>> = {
  [AuthoringMode.AI]: 'Generated, then reviewed',
  [AuthoringMode.MANUAL]: 'Built by hand',
  [AuthoringMode.HYBRID]: 'Generated, then edited',
};

/** Where a round's practice has got to. */
export enum PlanStatus {
  /** Settings chosen, nothing generated or assembled yet. */
  PLANNED = 'PLANNED',
  /** Questions assembled. Not visible to any student. */
  DRAFT = 'DRAFT',
  /** A named person has approved the content. */
  APPROVED = 'APPROVED',
  /** Assigned to students. */
  ASSIGNED = 'ASSIGNED',
  /** Withdrawn — kept, because "we tried this and pulled it" is worth knowing. */
  WITHDRAWN = 'WITHDRAWN',
}

/**
 * Whether the round's practice counts for anything (PRD §23.4, §23.7).
 *
 * §23.4: "label clearly whether an assessment is practice-only, evaluative, or a selection
 * gate." §23.7 is blunter: "completing practice does not automatically mean a candidate
 * has passed the employer's actual round."
 *
 * This is the most consequential field in the file. A student who aces the practice and is
 * then rejected at the real round has been misled if the platform implied the two were the
 * same thing — and a placement team that shortlists on practice scores for a round the
 * employer runs themselves is making a decision on the wrong evidence.
 */
export enum PracticeWeight {
  /** For the student's own preparation. Never an input to any decision. */
  PRACTICE_ONLY = 'PRACTICE_ONLY',
  /** Scored and visible to staff, and ONE input among others. */
  EVALUATIVE = 'EVALUATIVE',
  /** A gate: failing it stops a candidate, and an authorised person enabled that. */
  SELECTION_GATE = 'SELECTION_GATE',
}

export const PRACTICE_WEIGHT_LABELS: Readonly<Record<PracticeWeight, string>> = {
  [PracticeWeight.PRACTICE_ONLY]: 'Practice only — does not affect selection',
  [PracticeWeight.EVALUATIVE]: 'Evaluative — one input into the decision',
  [PracticeWeight.SELECTION_GATE]: 'Selection gate — failing this stops the candidate',
};

/** The settings §23.2 and §23.8 require an author to be able to set. */
export interface PlanConfig {
  questionCount?: number | null;
  durationMinutes?: number | null;
  /** Share of questions at each difficulty, 0–100, summing to 100 when given at all. */
  difficultyMix?: { easy: number; medium: number; hard: number } | null;
  /** Topics or skills the paper must cover. */
  topics?: string[] | null;
  /** Permitted languages for a coding round. */
  languages?: string[] | null;
  /** Marks per question, and the penalty for a wrong answer if any. */
  marksPerQuestion?: number | null
  negativeMarkPerQuestion?: number | null;
  /** Pass mark, where the round has one. */
  passMark?: number | null;
  attemptsAllowed?: number | null;
  /** Free text the student sees before starting. */
  instructions?: string | null;
  /** The rubric for anything a human scores. */
  rubric?: string | null;
}

export interface RoundAssessmentPlan {
  id?: string;
  driveId: string;
  /** Which of the drive's planned rounds this is the practice for. */
  roundId: string;
  roundKind: RoundKind;
  mode: AuthoringMode;
  status: PlanStatus;
  weight: PracticeWeight;
  config: PlanConfig;
  /** The scheduled assessment this plan produced — a LINK, never a copy (§12). */
  scheduledAssessmentId?: string | null;
  version: number;
}

export interface PlanProblem {
  code:
    | 'NO_PRACTICE_FOR_ROUND'
    | 'COUNT_REQUIRED'
    | 'DIFFICULTY_MIX_INVALID'
    | 'PASS_MARK_WITHOUT_SCORING'
    | 'GATE_NEEDS_APPROVAL'
    | 'NEGATIVE_MARK_WITHOUT_MARKS';
  message: string;
}

/**
 * Is this plan coherent?
 *
 * Each refusal is a way a plan would otherwise mislead somebody rather than merely be
 * untidy.
 */
export function checkPlan(
  plan: Pick<RoundAssessmentPlan, 'roundKind' | 'mode' | 'weight' | 'config'>,
  opts: { autoScored: boolean; gateApprovedBy?: string | null } = { autoScored: true },
): PlanProblem | null {
  const c = plan.config ?? {};

  if (c.difficultyMix) {
    const { easy, medium, hard } = c.difficultyMix;
    const total = (easy ?? 0) + (medium ?? 0) + (hard ?? 0);
    // A mix that does not total 100 is not a mix — it silently rescales the paper
    // without telling anybody, the same reason §6 rejects weights that miss 100.
    if (total !== 100) {
      return {
        code: 'DIFFICULTY_MIX_INVALID',
        message: `The difficulty mix adds up to ${total}%, not 100%.`,
      };
    }
  }

  if (plan.mode !== AuthoringMode.MANUAL && !c.questionCount) {
    // Manual authoring needs no count — the author adds questions until done. Generation
    // does, or there is nothing to tell the generator.
    return {
      code: 'COUNT_REQUIRED',
      message: 'Say how many questions to generate.',
    };
  }

  /**
   * A PASS MARK ON SOMETHING NOBODY SCORES IS A PROMISE THE PLATFORM CANNOT KEEP.
   * §23.3 distinguishes auto-scored rounds from rubric-reviewed ones, and a case study
   * with a "pass mark of 60" would show students a threshold that no number is ever
   * compared against.
   */
  if (c.passMark != null && !opts.autoScored) {
    return {
      code: 'PASS_MARK_WITHOUT_SCORING',
      message:
        'This round is reviewed by a person, not scored automatically, so a pass mark would be a threshold nothing is compared against. Use a rubric instead.',
    };
  }

  // Negative marking without positive marking is a paper that can only lose marks.
  if (c.negativeMarkPerQuestion != null && c.negativeMarkPerQuestion > 0 && !c.marksPerQuestion) {
    return {
      code: 'NEGATIVE_MARK_WITHOUT_MARKS',
      message: 'Set the marks per question before setting a penalty for a wrong answer.',
    };
  }

  /**
   * §6 and §23.5 both forbid a score rejecting anybody on its own "unless the authorised
   * operator has explicitly enabled a transparent rule". A selection gate IS that rule,
   * so it takes a named person — not a dropdown value.
   */
  if (plan.weight === PracticeWeight.SELECTION_GATE && !opts.gateApprovedBy) {
    return {
      code: 'GATE_NEEDS_APPROVAL',
      message:
        'A selection gate stops candidates on a score, so it needs a named approver before it can be saved.',
    };
  }

  return null;
}

/**
 * A starting config for a round, from §23.3's practice plan.
 *
 * Suggestions an operator overrides, never defaults applied silently — the difference
 * being that these are returned to the screen for editing rather than written anywhere.
 */
export function suggestedConfig(kind: RoundKind, durationMinutes: number | null): PlanConfig {
  const base: PlanConfig = { durationMinutes };
  switch (kind) {
    case RoundKind.APTITUDE:
      return { ...base, questionCount: 30, difficultyMix: { easy: 30, medium: 50, hard: 20 } };
    case RoundKind.TECHNICAL_MCQ:
      return { ...base, questionCount: 25, difficultyMix: { easy: 20, medium: 55, hard: 25 } };
    case RoundKind.CODING:
      // Two problems in ninety minutes is the campus norm; four would be a research
      // project and one tells you almost nothing.
      return { ...base, questionCount: 2, difficultyMix: { easy: 0, medium: 60, hard: 40 } };
    default:
      // Interviews, case studies and communication tasks are not question counts. Left
      // deliberately empty rather than filled with a plausible number.
      return base;
  }
}
