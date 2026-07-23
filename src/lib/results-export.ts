'use client';

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import type { AssessmentResults } from '@/lib/api/scheduling';

/** The report's full flat column set (order = report spec), one object per student. */
function flatRows(data: AssessmentResults): Record<string, string | number>[] {
  return data.rows.map((r) => ({
    Name: r.fullName ?? '',
    Email: r.email,
    Phone: r.phone ?? '',
    College: r.collegeName ?? '',
    Cohort: r.cohort ?? '',
    Assessment: data.assessment.title,
    'Started At': r.startedAt ? new Date(r.startedAt).toLocaleString() : '',
    'Submitted At': r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '',
    'Max Marks': r.total,
    Score: r.score,
    'Percentage': r.scorePct,
    Rank: r.rank,
    'Total Questions': r.totalQuestions,
    'Attempted Questions': r.attemptedQuestions,
    'Correct Answers': r.correctAnswers,
    'Incorrect Answers': r.incorrectAnswers,
    'Accuracy %': r.accuracy,
    'Time Taken (s)': r.timeTakenSec,
    'Tab Switches': r.tabSwitches,
    'Face Violations': r.faceViolations,
    'Fullscreen Exits': r.fullscreenExits,
    'Face Validation Failures': r.faceValidationFailures,
    'Multiple Face Detections': r.multipleFaceDetections,
    'Total Violations': r.violations,
    'Integrity Score': r.integrityScore ?? '',
    'Section-wise Scores': r.sections.map((s) => `${s.name}: ${s.correct}/${s.total}`).join('; '),
    'Pass/Fail': r.passed ? 'Pass' : 'Fail',
  }));
}

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

/** Escape one CSV cell (RFC-4180: wrap + double any quotes when needed). */
function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportResultsCsv(data: AssessmentResults): void {
  const rows = flatRows(data);
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(csvCell).join(','),
    ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(',')),
  ];
  download(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), `${fileBase(data)}.csv`);
}

export function exportResultsXlsx(data: AssessmentResults): void {
  const rows = flatRows(data);
  if (rows.length === 0) return;
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Results');
  XLSX.writeFile(wb, `${fileBase(data)}.xlsx`);
}

/** A readable landscape PDF: header + summary + a KEY-column table (the full 28-col
 *  set lives in the CSV/XLSX; a PDF table that wide is unreadable). */
export function exportResultsPdf(data: AssessmentResults): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  let y = 40;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(data.assessment.title, 40, y);
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100);
  const meta = [
    data.assessment.companyName,
    data.assessment.cohort ? `Cohort: ${data.assessment.cohort}` : null,
    new Date(data.assessment.scheduledAt).toLocaleString(),
    `${data.stats.attempted} attempted · avg ${data.stats.avgScorePct}% · ${data.stats.passed} passed · ${data.stats.flagged} flagged`,
  ]
    .filter(Boolean)
    .join('   ·   ');
  doc.text(meta, 40, y);
  y += 20;
  doc.setTextColor(0);

  const cols: Array<{ h: string; w: number; get: (r: AssessmentResults['rows'][number]) => string }> = [
    { h: '#', w: 26, get: (r) => String(r.rank) },
    { h: 'Name', w: 110, get: (r) => r.fullName ?? '' },
    { h: 'College', w: 130, get: (r) => r.collegeName ?? '' },
    { h: 'Score', w: 48, get: (r) => `${r.score}/${r.total}` },
    { h: '%', w: 30, get: (r) => String(r.scorePct) },
    { h: 'Correct', w: 50, get: (r) => `${r.correctAnswers}/${r.attemptedQuestions}` },
    { h: 'Acc%', w: 34, get: (r) => String(r.accuracy) },
    { h: 'Violations', w: 54, get: (r) => String(r.violations) },
    { h: 'Integrity', w: 48, get: (r) => (r.integrityScore != null ? String(r.integrityScore) : '-') },
    { h: 'Result', w: 44, get: (r) => (r.passed ? 'Pass' : 'Fail') },
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
    if (y > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage('a4', 'landscape');
      y = 40;
      drawHeader();
    }
    let x = 44;
    for (const c of cols) {
      const text = doc.splitTextToSize(c.get(r), c.w - 4)[0] ?? '';
      doc.text(text, x, y + 11);
      x += c.w;
    }
    doc.setDrawColor(226, 232, 240);
    doc.line(40, y + 15, W - 40, y + 15);
    y += 16;
  }

  doc.save(`${fileBase(data)}.pdf`);
}
