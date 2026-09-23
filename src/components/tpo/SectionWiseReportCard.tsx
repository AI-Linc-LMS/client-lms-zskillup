'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { csvScopeSlug, downloadCsv, toCsv } from '@/lib/csv';
import type { SectionOptionDto, SectionReportDto } from '@/shared/dto/section-report.dto';

/** The owner's column order. Accuracy is included: the spec lists it, and a bare
 *  correct-count invites the reader to divide it by the wrong denominator. */
const COLUMNS = [
  'Student Name',
  'Email',
  'Phone',
  'Questions Attempted',
  'Correct Answers',
  'Accuracy',
  'Average Test Score',
  'Strong Topics',
  'Moderate Topics',
  'Needs Work Topics',
] as const;

/** Topics in one cell, as the owner's sample shows them: "Percentages; Ratio". */
const topics = (list: string[]): string => list.join('; ');

/**
 * SECTION-WISE REPORT — one section, the whole roster, all of a student's history.
 *
 * The numbers are a student's WHOLE record in that section, not one test: distinct
 * questions attempted across assessments and practice (a question answered in a mock
 * and later practised is one question, judged by the most recent attempt), their
 * accuracy, their mean score over tests containing the section, and the topics they
 * are strong at, middling at, and struggling with.
 *
 * "Average test score" is blank, never 0, for a student who has sat no test with this
 * section in it — a zero would read as a student who tried and scored nothing.
 */
export function SectionWiseReportCard({
  listSections,
  loadReport,
}: {
  listSections: () => Promise<SectionOptionDto[]>;
  loadReport: (section: string) => Promise<SectionReportDto>;
}) {
  const [sections, setSections] = useState<SectionOptionDto[]>([]);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listSections()
      .then(setSections)
      .catch(() => setSections([]));
  }, [listSections]);

  const download = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const report = await loadReport(selected);
      if (report.rows.length === 0) {
        setError('No students on your college roster yet.');
        return;
      }
      const rows = report.rows.map((r) => [
        r.name ?? '',
        r.email,
        r.phone ?? '',
        r.questionsAttempted,
        r.correctAnswers,
        `${r.accuracy}%`,
        // Blank, not 0 — they have sat no test containing this section.
        r.averageTestScore ?? '',
        topics(r.strongTopics),
        topics(r.moderateTopics),
        topics(r.needsWorkTopics),
      ]);
      downloadCsv(`section-report-${csvScopeSlug(selected)}.csv`, toCsv([...COLUMNS], rows));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not build that report.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5">
      <span className="grid size-11 place-items-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
        <BarChart3 className="size-5" />
      </span>
      <h2 className="mt-3 text-base font-black text-navy">Section Wise Report</h2>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-600">
        Every student&apos;s record in one section across tests and practice — questions
        attempted, accuracy, average test score, and the topics they are strong at or
        struggling with.
      </p>
      <label className="mt-3 block">
        <span className="sr-only">Section</span>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
        >
          <option value="">Select a section…</option>
          {sections.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <p role="alert" className="mt-2 text-[11px] font-medium text-red-700">
          {error}
        </p>
      ) : null}
      <Button size="sm" className="mt-3 w-full" disabled={!selected || busy} onClick={() => void download()}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
        Download CSV
      </Button>
    </div>
  );
}
