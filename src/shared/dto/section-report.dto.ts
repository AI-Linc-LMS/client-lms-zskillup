/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo. Change both together.
 *
 * Section-wise report: how every student on a college's roster performs in ONE
 * section, across everything they have ever done — assessments AND practice.
 */

/** A section a report can be run for. `key` is what the API takes. */
export interface SectionOptionDto {
  /** The section's real name, exactly as the question bank and papers label it. */
  key: string;
  /** What to show in the picker — the same string; kept separate so a future
   *  rename never breaks a saved request. */
  label: string;
}

/** One student's standing in the chosen section. */
export interface SectionReportRowDto {
  userId: string;
  name: string | null;
  email: string;
  phone: string | null;
  /** DISTINCT questions attempted in this section, ever, across tests and practice. */
  questionsAttempted: number;
  /** Of those, the ones whose MOST RECENT attempt was correct. */
  correctAnswers: number;
  /** correct ÷ attempted, %. 0 when they have attempted nothing. */
  accuracy: number;
  /** Mean score % over the finished tests whose paper contains this section.
   *  Null when they have sat none — which is not the same as scoring zero. */
  averageTestScore: number | null;
  /** Topics inside the section, split by how the student is doing. Only topics
   *  with enough attempts to mean anything appear. */
  strongTopics: string[];
  moderateTopics: string[];
  needsWorkTopics: string[];
}

export interface SectionReportDto {
  section: string;
  /** Every student on the roster, including those with no activity at all. */
  rows: SectionReportRowDto[];
  /** The rules behind the three topic buckets, so the report can state them. */
  thresholds: {
    /** A topic needs at least this many attempted questions to be classified. */
    minQuestions: number;
    /** Accuracy at or above this is Strong. */
    strongAtLeast: number;
    /** Accuracy at or above this (and below strong) is Moderate; below it is Needs work. */
    moderateAtLeast: number;
  };
}
