import type { AssessmentResults, AssessmentResultSection } from '@/lib/api/scheduling';
import { CSV_BOM, toCsv } from '@/lib/csv';

/**
 * The student-result report's COLUMNS — the owner's format, shared by the CSV and the
 * Excel export.
 *
 * Fifteen fixed columns, then one PAIR per section of the paper — "Section-wise
 * Scores-<Section>" and "Section-wise Max Scores-<Section>" — in the assessment's own
 * section order. The section pairs are generated from the assessment: an assessment
 * with Aptitude / Case Study / Common Management gets six section columns, another with
 * two sections gets four. Nothing here is hard-coded to one paper.
 *
 * Kept apart from results-export.ts (which pulls in xlsx + jsPDF and is a client
 * module) so the column contract can be unit-tested with no browser and no bundler:
 *
 *   node --test src/lib/results-export-rows.test.mjs
 */

type ResultRow = AssessmentResults['rows'][number];

/** A cell value. `undefined` never appears — every row fills every column. */
export type ExportCell = string | number;

/** The fixed columns, in the owner's order. Section pairs are appended after these. */
export const FIXED_RESULT_COLUMNS = [
  'Name',
  'Phone',
  'Started At',
  'Submitted At',
  'Maximum Marks',
  'Overall Score',
  'Percentage',
  'Total Questions',
  'Attempted Questions',
  'Tab Switches Count',
  'Face Violations Count',
  'Fullscreen Exits Count',
  'Face Validation Failures Count',
  'Multiple Face Detections Count',
  'Total Violation Count',
] as const;

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

/** The full header row: the fixed columns then a score/max pair per section. */
export function resultsColumns(data: AssessmentResults): string[] {
  return [...FIXED_RESULT_COLUMNS, ...resultSections(data).flatMap((s) => sectionColumnNames(s.name))];
}

/** One student's cells, in `resultsColumns` order.
 *
 *  Every value is the one the report already carries — nothing is recomputed here; the
 *  marks, the percentage and the proctoring counts are all server-side business values
 *  (ADR-007). A section the student never opened is a 0 against the section's full
 *  maximum, never a blank: a blank cell reads as "not in this paper". */
function resultRow(r: ResultRow, sections: AssessmentResultSection[]): ExportCell[] {
  const scored = new Map((r.sections ?? []).map((s) => [s.name, s]));
  return [
    r.fullName ?? '',
    r.phone ?? '',
    r.startedAt ? new Date(r.startedAt).toLocaleString() : '',
    r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '',
    r.total,
    r.score,
    r.scorePct,
    r.totalQuestions,
    r.attemptedQuestions,
    r.tabSwitches,
    r.faceViolations,
    r.fullscreenExits,
    r.faceValidationFailures,
    r.multipleFaceDetections,
    r.violations,
    ...sections.flatMap((s) => [scored.get(s.name)?.score ?? 0, scored.get(s.name)?.maxMarks ?? s.maxMarks]),
  ];
}

/** Every student's cells, in `resultsColumns` order — the grid both exports write. */
export function resultsRows(data: AssessmentResults): ExportCell[][] {
  const sections = resultSections(data);
  return data.rows.map((r) => resultRow(r, sections));
}

/** The same grid as objects, for the Excel writer (which wants records + a header). */
export function resultsRecords(data: AssessmentResults): Record<string, ExportCell>[] {
  const columns = resultsColumns(data);
  return resultsRows(data).map((cells) =>
    Object.fromEntries(columns.map((c, i) => [c, cells[i]])),
  );
}

/** The CSV file body - BOM + CRLF, every cell quoted and formula-injection-safe (see
 *  lib/csv) - or '' when nobody attempted. Kept apart from the download for tests. */
export function buildResultsCsv(data: AssessmentResults): string {
  if (data.rows.length === 0) return '';
  return CSV_BOM + toCsv(resultsColumns(data), resultsRows(data));
}
