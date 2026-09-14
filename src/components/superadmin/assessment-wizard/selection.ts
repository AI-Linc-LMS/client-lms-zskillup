import type { AssessmentItemType, SampleDifficulty } from '@/lib/api/assessment-builder';
import type { BuilderSectionDto } from '@/shared/dto/assessment-builder.dto';

/**
 * Selection model for the assessment wizard's Questions step. Every question the admin
 * sees is a concrete id that will be persisted exactly as chosen ("fixed") — there is no
 * re-sampling at publish time.
 */

/** How an item got into the assessment. */
export type ItemOrigin = 'RANDOM' | 'MANUAL' | 'AI';

export interface PickedItem {
  /** Question id (MCQ) or coding-problem id — always lower-case. */
  id: string;
  type: AssessmentItemType;
  /** MCQ stem / coding title. */
  label: string;
  difficulty: string;
  origin: ItemOrigin;
  /** Random / AI items: the draw they came from, so a re-draw replaces exactly those. */
  drawId?: string;
}

/** One RANDOM draw (the parameters it was sampled with + what the bank had). */
export interface RandomDraw {
  id: string;
  type: AssessmentItemType;
  /** e.g. "Quantitative Aptitude › Percentages", "Arrays", "Whole coding bank". */
  scopeLabel: string;
  /** MCQ: the section/topic id (whole subtree). Absent = whole MCQ bank. */
  topicId?: string;
  /** MCQ topic name or coding tag — what AI generation is keyed by. */
  topicName?: string;
  codingTopic?: string;
  allCoding?: boolean;
  difficulty: SampleDifficulty;
  companySlug?: string;
  /** How many the admin asked for. */
  requested: number;
  /** Eligible pool at the last draw (after exclusions), as reported by the server. */
  available: number;
  /** The bank could not fill the last request — the only time AI top-up is offered. */
  bankShort: boolean;
}

export interface WizardSection {
  key: string;
  name: string;
  /** Marks per MCQ in this section (1-20). */
  mcqMarks: number;
  /** Marks per coding problem in this section (1-20). */
  codingMarks: number;
  items: PickedItem[];
  draws: RandomDraw[];
}

/** Server limits (BuilderSectionDto / CreateAssessmentDto / SampleQuestionsDto). */
export const LIMITS = {
  mcqPerSection: 200,
  codingPerSection: 50,
  /** Payload sections are split MCQ / coding, and the DTO allows 50. */
  wizardSections: 25,
  sampleCount: 50,
  excludeIds: 500,
  marks: 20,
} as const;

let seq = 0;
export const nextKey = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(seq += 1)}`;

export const normId = (id: string) => id.toLowerCase();

export function newSection(index: number): WizardSection {
  return { key: nextKey('sec'), name: `Section ${index}`, mcqMarks: 1, codingMarks: 1, items: [], draws: [] };
}

/** Ids already in the assessment (new selections in every section + the edited
 *  assessment's existing items), optionally for one item type. */
export function takenIds(
  sections: WizardSection[],
  existing: Array<{ id: string; type: AssessmentItemType }>,
  type?: AssessmentItemType,
): Set<string> {
  const out = new Set<string>();
  for (const s of sections) for (const it of s.items) if (!type || it.type === type) out.add(it.id);
  for (const e of existing) if (!type || e.type === type) out.add(normId(e.id));
  return out;
}

/** Which new section currently holds an id (for "In Section 2" hints). */
export function sectionHolding(sections: WizardSection[], id: string): WizardSection | undefined {
  return sections.find((s) => s.items.some((it) => it.id === id));
}

export interface SectionTally {
  key: string;
  name: string;
  mcq: number;
  coding: number;
  marks: number;
}

export interface SelectionTally {
  total: number;
  mcq: number;
  coding: number;
  /** Draft marks of the NEW selection (per-section marks × items). */
  marks: number;
  byOrigin: Record<ItemOrigin, number>;
  byDifficulty: { EASY: number; MEDIUM: number; HARD: number; OTHER: number };
  sections: SectionTally[];
}

/** Draft tally of what the admin has picked so far. (After publish the wizard shows the
 *  server's own counts and marks instead.) */
export function tallySelection(sections: WizardSection[]): SelectionTally {
  const t: SelectionTally = {
    total: 0,
    mcq: 0,
    coding: 0,
    marks: 0,
    byOrigin: { RANDOM: 0, MANUAL: 0, AI: 0 },
    byDifficulty: { EASY: 0, MEDIUM: 0, HARD: 0, OTHER: 0 },
    sections: [],
  };
  for (const s of sections) {
    const row: SectionTally = { key: s.key, name: s.name, mcq: 0, coding: 0, marks: 0 };
    for (const it of s.items) {
      if (it.type === 'MCQ') {
        row.mcq += 1;
        row.marks += s.mcqMarks;
      } else {
        row.coding += 1;
        row.marks += s.codingMarks;
      }
      t.byOrigin[it.origin] += 1;
      const d = it.difficulty?.toUpperCase();
      if (d === 'EASY' || d === 'MEDIUM' || d === 'HARD') t.byDifficulty[d] += 1;
      else t.byDifficulty.OTHER += 1;
    }
    t.mcq += row.mcq;
    t.coding += row.coding;
    t.marks += row.marks;
    t.sections.push(row);
  }
  t.total = t.mcq + t.coding;
  return t;
}

/** Problems that would make the server refuse the payload, phrased for the admin. */
export function selectionProblems(sections: WizardSection[]): string[] {
  const out: string[] = [];
  for (const s of sections) {
    const mcq = s.items.filter((i) => i.type === 'MCQ').length;
    const coding = s.items.length - mcq;
    if (!s.name.trim()) out.push('Every section needs a name.');
    if (mcq > LIMITS.mcqPerSection) out.push(`${s.name}: at most ${LIMITS.mcqPerSection} MCQs per section (has ${mcq}).`);
    if (coding > LIMITS.codingPerSection)
      out.push(`${s.name}: at most ${LIMITS.codingPerSection} coding problems per section (has ${coding}).`);
    for (const [label, m] of [
      ['MCQ marks', s.mcqMarks],
      ['Coding marks', s.codingMarks],
    ] as const) {
      if (!Number.isInteger(m) || m < 1 || m > LIMITS.marks) out.push(`${s.name}: ${label} must be 1–${LIMITS.marks}.`);
    }
  }
  return [...new Set(out)];
}

/** The create / append payload: one payload section per item type per wizard section, so
 *  MCQs and coding problems keep their own marks. Empty sections are left out. */
export function toPayloadSections(sections: WizardSection[]): BuilderSectionDto[] {
  const out: BuilderSectionDto[] = [];
  for (const s of sections) {
    const mcq = s.items.filter((i) => i.type === 'MCQ').map((i) => i.id);
    const coding = s.items.filter((i) => i.type === 'CODING').map((i) => i.id);
    const name = s.name.trim() || 'Section';
    if (mcq.length) out.push({ name, questionIds: mcq, codingProblemIds: [], marksPerQuestion: s.mcqMarks });
    if (coding.length)
      out.push({
        name: mcq.length ? `${name} · Coding` : name,
        questionIds: [],
        codingProblemIds: coding,
        marksPerQuestion: s.codingMarks,
      });
  }
  return out;
}

/** Remove ids everywhere. `keepFirst` keeps the first occurrence (for "picked twice"). */
export function removeIds(sections: WizardSection[], ids: Iterable<string>, keepFirst = false): WizardSection[] {
  const drop = new Set([...ids].map(normId));
  const seen = new Set<string>();
  return sections.map((s) => ({
    ...s,
    items: s.items.filter((it) => {
      if (!drop.has(it.id)) return true;
      if (keepFirst && !seen.has(it.id)) {
        seen.add(it.id);
        return true;
      }
      return false;
    }),
  }));
}

export const DIFFICULTY_LABEL: Record<SampleDifficulty, string> = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
  MIXED: 'Mixed',
};
