'use client';

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import type { AssessmentResults } from '@/lib/api/scheduling';
import { branchShort } from '@/lib/branch';
import { buildResultsCsv, resultsColumns, resultsRecords } from '@/lib/results-export-rows';

type ResultRow = AssessmentResults['rows'][number];

/** The CSV body, re-exported from the pure column module so existing importers (and
 *  the tests) keep one entry point. */
export { buildResultsCsv };

function fileBase(data: AssessmentResults): string {
  const safe = data.assessment.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return `results-${safe || 'assessment'}`;
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportResultsCsv(data: AssessmentResults): void {
  const csv = buildResultsCsv(data);
  if (!csv) return;
  download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${fileBase(data)}.csv`);
}

export function exportResultsXlsx(data: AssessmentResults): void {
  const rows = resultsRecords(data);
  if (rows.length === 0) return;
  // No formula neutralising needed (unlike the CSV): json_to_sheet stores every string
  // as a text cell and the writer only emits a formula for a cell's `f`, which is never
  // set - so "=HYPERLINK(...)" typed as a name opens as literal text.
  // `header` is passed explicitly so the sheet's columns are the CSV's columns, in the
  // same order, rather than whatever key order the first record happens to have.
  const ws = XLSX.utils.json_to_sheet(rows, { header: resultsColumns(data) });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Results');
  XLSX.writeFile(wb, `${fileBase(data)}.xlsx`);
}

const PDF_FONT = 8.5; // table body
const PDF_SUB_FONT = 7; // the smaller "email · phone" line under a name
const PDF_LINE = 10; // advance per body line
const PDF_SUB_LINE = 8.5; // advance per sub line
const PDF_PAD = 4; // cell top padding
const PDF_MIN_ROW = 16;

/** Wrap `text` to `width` at the doc's CURRENT font size, keeping at most `maxLines`.
 *  A longer value ends in "..." so the cut is visible, never silently clipped. */
function wrapText(doc: jsPDF, text: string, width: number, maxLines: number): string[] {
  if (!text) return [];
  const lines: string[] = doc.splitTextToSize(text, width);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last && doc.getTextWidth(`${last}...`) > width) last = last.slice(0, -1);
  kept[maxLines - 1] = `${last.trimEnd()}...`;
  return kept;
}

/** A readable landscape PDF: header + summary + a KEY-column table (the full column
 *  set lives in the CSV/XLSX; a PDF table that wide is unreadable). Each name carries
 *  a smaller "email · phone" line, a row is as tall as its wrapped cells, and the
 *  column header repeats on every page. */
export function buildResultsPdf(data: AssessmentResults): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  let y = 40;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  for (const line of wrapText(doc, data.assessment.title, W - 80, 2)) {
    doc.text(line, 40, y);
    y += 18;
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100);
  const a = data.assessment;
  const meta = [
    a.companyName,
    a.cohort ? `Cohort: ${a.cohort}` : null,
    new Date(a.scheduledAt).toLocaleString(),
    // The pass criterion belongs in the header of the printed report, not only in
    // the reader's head. The marks split arrives with the paired backend; until then
    // the pass mark is still stated, just without the per-half breakdown.
    a.passMarks != null
      ? `Pass mark: ${a.passingScore}% (${a.passMarks} / ${a.maxMarks} marks)`
      : `Pass mark: ${a.passingScore}% of ${a.maxMarks} marks`,
    a.codingCount && a.codingCount > 0
      ? `${a.totalQuestions} questions - MCQ ${a.mcqCount} (${a.mcqMarks} marks), coding ${a.codingCount} (${a.codingMarks} marks)`
      : `${a.totalQuestions} questions (${a.maxMarks} marks)`,
    `${data.stats.attempted} attempted · avg ${data.stats.avgScorePct}% · ${data.stats.passed} passed · ${data.stats.flagged} flagged`,
  ]
    .filter(Boolean)
    .join('   ·   ');
  for (const line of wrapText(doc, meta, W - 80, 4)) {
    doc.text(line, 40, y);
    y += 12;
  }
  y += 8;
  doc.setTextColor(0);

  const cols: Array<{
    h: string;
    w: number;
    get: (r: ResultRow) => string;
    /** Wrap to this many lines (default 1 - ellipsized). */
    maxLines?: number;
    /** A smaller grey line under the cell. */
    sub?: (r: ResultRow) => string;
  }> = [
    { h: '#', w: 26, get: (r) => String(r.rank) },
    {
      h: 'Name',
      w: 178,
      get: (r) => r.fullName || '-',
      maxLines: 3,
      sub: (r) => [r.email, r.phone].filter(Boolean).join(' · '),
    },
    // Legal college names run long ("... (Autonomous), <city>, <state>") - allow a 4th line.
    { h: 'College', w: 138, get: (r) => r.collegeName ?? '', maxLines: 4 },
    { h: 'Department', w: 64, get: (r) => branchShort(r.branch) },
    { h: 'Marks', w: 48, get: (r) => `${r.score}/${r.total}` },
    { h: 'Score%', w: 38, get: (r) => String(r.scorePct) },
    {
      h: 'Correct',
      w: 58,
      get: (r) => `${r.correctAnswers}/${r.attemptedQuestions}`,
      sub: (r) => `of ${r.totalQuestions}`,
    },
    { h: 'Acc%(att)', w: 46, get: (r) => String(r.accuracy) },
    { h: 'Violations', w: 54, get: (r) => String(r.violations) },
    { h: 'Integrity', w: 48, get: (r) => (r.integrityScore != null ? String(r.integrityScore) : '-') },
    {
      h: 'Result',
      w: 56,
      get: (r) => (r.passed ? 'Pass' : 'Fail') + (r.autoSubmittedByProctor ? ' (auto)' : ''),
    },
  ];

  const drawHeader = () => {
    doc.setFillColor(15, 23, 42);
    doc.rect(40, y, W - 80, 18, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    let x = 44;
    for (const c of cols) {
      doc.text(c.h, x, y + 12);
      x += c.w;
    }
    y += 18;
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
  };
  drawHeader();

  for (const r of data.rows) {
    // Measure first: the row is as tall as its tallest wrapped cell, and a row that
    // won't fit starts the next page (under a repeated header) instead of overflowing.
    doc.setFontSize(PDF_FONT);
    const main = cols.map((c) => wrapText(doc, c.get(r), c.w - 4, c.maxLines ?? 1));
    doc.setFontSize(PDF_SUB_FONT);
    const sub = cols.map((c) => (c.sub ? wrapText(doc, c.sub(r), c.w - 4, 2) : []));
    const rowH = Math.max(
      PDF_MIN_ROW,
      ...main.map((lines, i) => PDF_PAD + lines.length * PDF_LINE + sub[i].length * PDF_SUB_LINE + 2),
    );
    if (y + rowH > H - 30) {
      doc.addPage('a4', 'landscape');
      y = 40;
      drawHeader();
    }

    let x = 44;
    cols.forEach((c, i) => {
      doc.setFontSize(PDF_FONT);
      main[i].forEach((line, n) => doc.text(line, x, y + PDF_PAD + 7 + n * PDF_LINE));
      if (sub[i].length) {
        const top = y + PDF_PAD + main[i].length * PDF_LINE;
        doc.setFontSize(PDF_SUB_FONT);
        doc.setTextColor(100, 116, 139);
        sub[i].forEach((line, n) => doc.text(line, x, top + 6 + n * PDF_SUB_LINE));
        doc.setTextColor(0);
      }
      x += c.w;
    });
    doc.setDrawColor(226, 232, 240);
    doc.line(40, y + rowH - 1, W - 40, y + rowH - 1);
    y += rowH;
  }

  return doc;
}

export function exportResultsPdf(data: AssessmentResults): void {
  buildResultsPdf(data).save(`${fileBase(data)}.pdf`);
}
