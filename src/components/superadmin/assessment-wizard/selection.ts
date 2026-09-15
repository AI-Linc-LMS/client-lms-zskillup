import type { AssessmentItemType, SampleDifficulty } from '@/lib/api/assessment-builder';
import type { BuilderSectionDto } from '@/shared/dto/assessment-builder.dto';
import { CODING_SECTION_LABEL } from '@/shared/question-taxonomy';

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
  /** BuilderSectionDto.name's @MaxLength. */
  sectionName: 120,
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

/** Identity of a picked item: MCQ and coding ids come from different tables. */
const itemKey = (type: AssessmentItemType, id: string) => `${type}:${normId(id)}`;

/** Is this id (of this type) already somewhere else in the assessment? */
export type IsTaken = (type: AssessmentItemType, id: string) => boolean;

/** Builds a section's next state from its LATEST state. */
export type SectionEdit = (section: WizardSection, isTaken: IsTaken) => WizardSection;

/** What an edit did to the section's items. */
export interface EditResult {
  /** Items that joined the section. */
  added: number;
  /** Items the edit tried to add that the assessment already has (left out). */
  skipped: number;
}

/** Updates one section; every add in the wizard goes through this. */
export type SectionUpdater = (edit: SectionEdit) => EditResult;

/**
 * Apply `edit` to section `key` of the LATEST selection and enforce the one invariant the
 * server relies on: an id appears at most once in the whole assessment (every new section +
 * the edited assessment's existing items). Items the edit adds that are already elsewhere,
 * or repeated within the section, are dropped and counted as `skipped` — so a draw, fill or
 * AI item that lands after something else took the same id can never build a duplicate.
 * Items already in the section before the edit are kept (only a repeated copy is dropped).
 */
export function applySectionEdit(
  sections: WizardSection[],
  existing: Array<{ id: string; type: AssessmentItemType }>,
  key: string,
  edit: SectionEdit,
): { sections: WizardSection[]; result: EditResult } {
  const target = sections.find((s) => s.key === key);
  // The section was removed while a request was in flight: nothing to add it to.
  if (!target) return { sections, result: { added: 0, skipped: 0 } };
  const elsewhere = new Set<string>();
  for (const s of sections) if (s.key !== key) for (const it of s.items) elsewhere.add(itemKey(it.type, it.id));
  for (const e of existing) elsewhere.add(itemKey(e.type, e.id));
  const before = new Set(target.items.map((it) => itemKey(it.type, it.id)));

  const draft = edit(target, (type, id) => elsewhere.has(itemKey(type, id)));
  const seen = new Set<string>();
  let added = 0;
  let skipped = 0;
  const items = draft.items.filter((it) => {
    const k = itemKey(it.type, it.id);
    const isNew = !before.has(k);
    if (seen.has(k) || (isNew && elsewhere.has(k))) {
      skipped += 1;
      return false;
    }
    seen.add(k);
    if (isNew) added += 1;
    return true;
  });
  const next = draft === target ? target : { ...draft, items };
  return { sections: next === target ? sections : sections.map((s) => (s.key === key ? next : s)), result: { added, skipped } };
}

export const skippedNote = (n: number) => `${n} skipped (already selected).`;

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

const CODING_SUFFIX = ` · ${CODING_SECTION_LABEL}`;

/** The create / append payload: one payload section per item type per wizard section, so
 *  MCQs and coding problems keep their own marks. Empty sections are left out. The coding
 *  half of a mixed section is named "<name> · Coding / Programming" (the name is shortened
 *  only if the two together would exceed the server's length limit). */
export function toPayloadSections(sections: WizardSection[]): BuilderSectionDto[] {
  const out: BuilderSectionDto[] = [];
  for (const s of sections) {
    const mcq = s.items.filter((i) => i.type === 'MCQ').map((i) => i.id);
    const coding = s.items.filter((i) => i.type === 'CODING').map((i) => i.id);
    const name = s.name.trim() || 'Section';
    if (mcq.length) out.push({ name, questionIds: mcq, codingProblemIds: [], marksPerQuestion: s.mcqMarks });
    if (coding.length)
      out.push({
        name: mcq.length
          ? `${name.slice(0, LIMITS.sectionName - CODING_SUFFIX.length).trimEnd()}${CODING_SUFFIX}`
          : name,
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
