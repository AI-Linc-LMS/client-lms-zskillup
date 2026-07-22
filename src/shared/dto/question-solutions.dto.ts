/**
 * SHARED CONTRACT - DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo. Change both together.
 *
 * The 3-section solution shown on the adaptive/quiz answer review:
 * a detailed worked solution, a shortcut/trick approach, and a concept video
 * (per-question, "coming soon" until wired up).
 */

export type ConceptVideoStatus = 'COMING_SOON' | 'AVAILABLE';

export interface QuestionSolutionDto {
  questionId: string;
  /** Full step-by-step worked solution. */
  detailed: string;
  /** Quick trick / elimination / estimation approach. */
  shortcut: string;
  /** Null while the concept video for this question/topic isn't wired yet. */
  conceptVideoUrl: string | null;
  conceptVideoStatus: ConceptVideoStatus;
  /** True when the detailed/shortcut were produced by AI (vs the stored bank solution). */
  aiGenerated: boolean;
}
