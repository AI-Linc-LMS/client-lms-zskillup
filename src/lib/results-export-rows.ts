import type { AssessmentResults, AssessmentResultSection } from '@/lib/api/scheduling';
import { CSV_BOM, toCsv } from '@/lib/csv';

/**
 * The student-result report's COLUMNS — the owner's format, shared by the CSV, the
 * Excel export and the TPO's Placement Readiness Test report.
 *
 * A block of fixed columns, then one PAIR per section of the paper — "Section-wise
 * Scores-<Section>" and "Section-wise Max Scores-<Section>" — in the assessment's own
 * section order. The section pairs are generated from the assessment: an assessment
 * with Aptitude / Case Study / Common Management gets six section columns, another
 * with Numerical Ability / Logical Reasoning / Verbal Ability / Technical MCQs gets
 * eight. Nothing here is hard-coded to one paper.
 *
 * TWO VARIANTS of the fixed block ship, and they differ by exactly two decisions, so
 * they are a PARAMETER rather than a second copy of the file — a fork would let the
 * two drift, and the drift would be silent (a header that no longer matches its own
 * cells is still a valid CSV):
 *
 *   {@link RESULTS_MODAL_COLUMNS}   the admin/TPO results modal — no Email (the roster
 *                                   it sits beside already shows it), plus the six
 *                                   proctoring counts, because that export is read to
 *                                   audit a sitting.
 *   {@link TEST_REPORT_COLUMNS}     the TPO's per-test report — Email (it is how a
 *                                   placement office identifies a student outside the
 *                                   console) and no proctoring, because the report is
 *                                   circulated as a score sheet.
 *
 * Each column is one {@link FixedField}: its header and the cell that fills it are
 * declared together, so a variant can never emit a header whose values come from a
 * different column.
 *
 * Kept apart from results-export.ts (which pulls in xlsx + jsPDF and is a client
 * module) so the column contract can be unit-tested with no browser and no bundler:
 *
 *   node --test src/lib/results-export-rows.test.mjs
 */

type ResultRow = AssessmentResults['rows'][number];

/** A cell value. `undefined` never appears — every row fills every column. */
export type ExportCell = string | number;

/** One fixed column: its header and the cell it takes from a student's row. */
interface FixedField {
  header: string;
  value: (r: ResultRow) => ExportCell;
}

/** Which optional fixed columns a report carries. */
export interface ResultColumnVariant {
  /** The student's Email, straight after Name. */
  email: boolean;
  /** The six proctoring counts, after Attempted Questions. */
  proctoring: boolean;
}

/** The results modal's export (CSV + XLSX): no Email, with proctoring. */
export const RESULTS_MODAL_COLUMNS: ResultColumnVariant = { email: false, proctoring: true };

/** The TPO's Placement Readiness Test report: with Email, no proctoring. */
export const TEST_REPORT_COLUMNS: ResultColumnVariant = { email: true, proctoring: false };

const NAME: FixedField = { header: 'Name', value: (r) => r.fullName ?? '' };
const EMAIL: FixedField = { header: 'Email', value: (r) => r.email ?? '' };

/** A timestamp as text — never a bare Date, so a spreadsheet cannot render it as ####. */
const stamp = (iso: string | null): string => (iso ? new Date(iso).toLocaleString() : '');

/** The columns EVERY variant carries, in the owner's order. Nothing is recomputed
 *  here: the marks, the percentage and the counts are all server-side business values
 *  (ADR-007) that the report already carries. */
const CORE: FixedField[] = [
  { header: 'Phone', value: (r) => r.phone ?? '' },
  { header: 'Started At', value: (r) => stamp(r.startedAt) },
  { header: 'Submitted At', value: (r) => stamp(r.submittedAt) },
  { header: 'Maximum Marks', value: (r) => r.total },
  { header: 'Overall Score', value: (r) => r.score },
  { header: 'Percentage', value: (r) => r.scorePct },
  { header: 'Total Questions', value: (r) => r.totalQuestions },
  { header: 'Attempted Questions', value: (r) => r.attemptedQuestions },
];

/** The proctoring audit block — the results modal's export only. */
const PROCTORING: FixedField[] = [
  { header: 'Tab Switches Count', value: (r) => r.tabSwitches },
  { header: 'Face Violations Count', value: (r) => r.faceViolations },
  { header: 'Fullscreen Exits Count', value: (r) => r.fullscreenExits },
  { header: 'Face Validation Failures Count', value: (r) => r.faceValidationFailures },
  { header: 'Multiple Face Detections Count', value: (r) => r.multipleFaceDetections },
  { header: 'Total Violation Count', value: (r) => r.violations },
];

/** The fixed columns of one variant, in order. */
function fixedFields(variant: ResultColumnVariant): FixedField[] {
  return [
    NAME,
    ...(variant.email ? [EMAIL] : []),
    ...CORE,
    ...(variant.proctoring ? PROCTORING : []),
  ];
}

/** The fixed column NAMES of one variant — the header before the section pairs. */
export function fixedResultColumns(variant: ResultColumnVariant = RESULTS_MODAL_COLUMNS): string[] {
  return fixedFields(variant).map((f) => f.header);
}

/** The results modal's fifteen fixed columns (kept as a named constant: it is the
 *  format the owner signed off on, and the tests state it column by column). */
export const FIXED_RESULT_COLUMNS: readonly string[] = fixedResultColumns(RESULTS_MODAL_COLUMNS);

/** Column titles for one section. Exported so the test states the exact spelling. */
export function sectionColumnNames(section: string): [score: string, max: string] {
  return [`Section-wise Scores-${section}`, `Section-wise Max Scores-${section}`];
}

/**
 * The assessment's sections, deduplicated, in the paper's own order (`order` = the
 * section's first item; ties break by name so the order is total and stable).
 *
 * Taken from the union of the students' section lists rather than the first row's: the
 * backend gives every student every section, and a union is still correct if one ever
 * does not.
 */
export function resultSections(data: AssessmentResults): AssessmentResultSection[] {
  const byName = new Map<string, AssessmentResultSection>();
  for (const row of data.rows) {
    for (const s of row.sections ?? []) if (!byName.has(s.name)) byName.set(s.name, s);
  }
  return [...byName.values()].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

/** The full header row: the variant's fixed columns then a score/max pair per section. */
export function resultsColumns(
  data: AssessmentResults,
  variant: ResultColumnVariant = RESULTS_MODAL_COLUMNS,
): string[] {
  return [
    ...fixedResultColumns(variant),
    ...resultSections(data).flatMap((s) => sectionColumnNames(s.name)),
  ];
}

/** One student's cells, in `resultsColumns` order.
 *
 *  A section the student never opened is a 0 against the section's full maximum, never
 *  a blank: a blank cell reads as "not in this paper". */
function resultRow(
  r: ResultRow,
  sections: AssessmentResultSection[],
  fields: FixedField[],
): ExportCell[] {
  const scored = new Map((r.sections ?? []).map((s) => [s.name, s]));
  return [
    ...fields.map((f) => f.value(r)),
    ...sections.flatMap((s) => [
      scored.get(s.name)?.score ?? 0,
      scored.get(s.name)?.maxMarks ?? s.maxMarks,
    ]),
  ];
}

/** Every student's cells, in `resultsColumns` order — the grid both exports write. */
export function resultsRows(
  data: AssessmentResults,
  variant: ResultColumnVariant = RESULTS_MODAL_COLUMNS,
): ExportCell[][] {
  const sections = resultSections(data);
  const fields = fixedFields(variant);
  return data.rows.map((r) => resultRow(r, sections, fields));
}

/** The same grid as objects, for the Excel writer (which wants records + a header). */
export function resultsRecords(
  data: AssessmentResults,
  variant: ResultColumnVariant = RESULTS_MODAL_COLUMNS,
): Record<string, ExportCell>[] {
  const columns = resultsColumns(data, variant);
  return resultsRows(data, variant).map((cells) =>
    Object.fromEntries(columns.map((c, i) => [c, cells[i]])),
  );
}

/** The CSV BODY — header + rows, every cell quoted and formula-injection-safe (see
 *  lib/csv), CRLF line endings, and NO byte-order mark: this is what `downloadCsv`
 *  wants, since it adds the BOM itself. '' when nobody attempted. */
export function resultsCsvBody(
  data: AssessmentResults,
  variant: ResultColumnVariant = RESULTS_MODAL_COLUMNS,
): string {
  if (data.rows.length === 0) return '';
  return toCsv(resultsColumns(data, variant), resultsRows(data, variant));
}

/** The complete CSV FILE — {@link resultsCsvBody} with the BOM in front, for the
 *  callers that hand a Blob straight to the browser. */
export function buildResultsCsv(
  data: AssessmentResults,
  variant: ResultColumnVariant = RESULTS_MODAL_COLUMNS,
): string {
  const body = resultsCsvBody(data, variant);
  return body ? CSV_BOM + body : '';
}
