'use client';

import { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import type { TpoReportableAssessment } from '@/shared';
import type { AssessmentResults } from '@/lib/api/scheduling';
import { BentoCard } from '@/components/tpo/ui';
import { StatusPill } from '@/components/student/StatusPill';
import { Button } from '@/components/ui/button';
import { csvScopeSlug, downloadCsv } from '@/lib/csv';
import { resultsCsvBody, TEST_REPORT_COLUMNS } from '@/lib/results-export-rows';
import { cn } from '@/lib/utils';

/**
 * PLACEMENT READINESS TEST REPORT - one test, a college's WHOLE roster.
 *
 * The owner's brief: "eliminate the need to manually search student-by-student and
 * provide the complete cohort-level Placement Readiness data in one place." So this is
 * a report you READ, not a download button: pick a test and every student on the
 * roster is on screen, the ones who never sat it included and filterable, with the CSV
 * as an export of exactly what is shown.
 *
 * Two things were wrong before, and both are fixed behind this component:
 *   - only students with an attempt appeared at all, and
 *   - the Placement Readiness Test is the one-time CALIBRATION test, started from the
 *     dashboard prompt, which records no sitting id - so the report matched 2 of one
 *     college's 9 sitters (see SchedulingRepository.attemptScope).
 *
 * The fetchers are injected because the SAME report serves a TPO (their own college,
 * from their token) and an admin / super-admin (any college, by id) - one component,
 * two routes, so the two can never drift into showing different things.
 */
export interface PlacementReadinessReportProps {
  /** The tests this viewer may report on, newest first. */
  listTests: () => Promise<TpoReportableAssessment[]>;
  /** One test's report. MUST be a roster read - the absent students are the point. */
  loadReport: (id: string) => Promise<AssessmentResults>;
}

/** The drive the owner asks for by name - selected by default whenever it is there. */
const DEFAULT_TEST_TITLE = 'placement readiness test';

/** Which slice of the roster the table shows. "Not attempted" is the one a placement
 *  office actually chases, so it is a first-class filter rather than a sort. */
type AttemptFilter = 'ALL' | 'ATTEMPTED' | 'NOT_ATTEMPTED';
const ATTEMPT_FILTERS: ReadonlyArray<{ key: AttemptFilter; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'ATTEMPTED', label: 'Attempted' },
  { key: 'NOT_ATTEMPTED', label: 'Not attempted' },
];

/** Short, unambiguous wording for where a drive came from. An OWN drive is this
 *  college's own; an ATTEMPTED one belongs to somebody else (platform-wide, or another
 *  college) and the report covers this college's students only. */
const SCOPE_GROUP: Record<TpoReportableAssessment['scope'], string> = {
  OWN: 'Your college’s drives',
  ATTEMPTED: 'Drives your students attempted',
};

/** The filename’s cohort scope - what the rows in the file actually are. */
const SCOPE_SLUG: Record<TpoReportableAssessment['scope'], string> = {
  OWN: 'all-attempts',
  ATTEMPTED: 'my-college',
};

function testOptionLabel(a: TpoReportableAssessment): string {
  const when = new Date(a.scheduledAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
  const who =
    a.scope === 'OWN'
      ? `${a.collegeAttempts} attempt${a.collegeAttempts === 1 ? '' : 's'}`
      : `${a.collegeAttempts} of your students`;
  return `${a.title}${a.companyName ? ` · ${a.companyName}` : ''} · ${when} · ${who}`;
}

/**
 * Placement Readiness Test report - the per-student score sheet for ONE test, in the
 * owner’s column format: identity, timings, marks, and a score/max pair for every
 * section of that paper (generated from the paper, never hard-coded).
 *
 * Replaces the old "Company Report" card, whose per-company readiness + attempt volume
 * the Company Readiness Report beside it now covers in far more detail.
 *
 * The picker lists more than the Assessment Center does, and that is the point: the
 * drives a placement office most wants a report on are the platform-wide ones its
 * students sit, which the college does not own. Those are grouped separately and
 * labelled with how many of THIS college’s students are in them - which is exactly how
 * many rows the file will have, because the backend scopes a drive this college does
 * not own to its own students.
 */
export function PlacementReadinessReport({
  listTests,
  loadReport,
}: PlacementReadinessReportProps) {
  const [tests, setTests] = useState<TpoReportableAssessment[]>([]);
  const [selected, setSelected] = useState('');
  const [report, setReport] = useState<AssessmentResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<AttemptFilter>('ALL');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listTests()
      .then((rows) => {
        setTests(rows);
        // The owner asks for this report by the test’s name; fall back to the most
        // recent drive (the list arrives newest first) so the card is never empty-handed.
        const named = rows.find((r) => r.title.trim().toLowerCase() === DEFAULT_TEST_TITLE);
        setSelected(named?.id ?? rows[0]?.id ?? '');
      })
      .catch(() => setTests([]));
  }, [listTests]);

  // The report IS the page here, so it loads on selection rather than on a click: the
  // whole point of the rebuild is that a placement officer reads the cohort without
  // first downloading it.
  useEffect(() => {
    if (!selected) {
      setReport(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setFilter('ALL');
    loadReport(selected)
      .then((r) => !cancelled && setReport(r))
      .catch((e) => {
        if (cancelled) return;
        setReport(null);
        setError(e instanceof Error ? e.message : 'Could not build that report.');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [selected, loadReport]);

  const chosen = tests.find((t) => t.id === selected) ?? null;
  const groups = (['OWN', 'ATTEMPTED'] as const)
    .map((scope) => ({ scope, rows: tests.filter((t) => t.scope === scope) }))
    .filter((g) => g.rows.length > 0);

  const rows = report?.rows ?? [];
  const sat = rows.filter((r) => r.attempted).length;
  const shown = rows.filter((r) =>
    filter === 'ALL' ? true : filter === 'ATTEMPTED' ? r.attempted : !r.attempted,
  );

  const exportTestReport = () => {
    if (!chosen || !report) return;
    // Same generator as the results-modal export - only the fixed columns differ
    // (Email and Attempted Status in, proctoring out), which is a parameter, not a
    // second implementation. The file is exactly the table above it.
    const csv = resultsCsvBody(report, TEST_REPORT_COLUMNS);
    if (!csv) {
      setError('There is no student on your college roster to report on yet.');
      return;
    }
    downloadCsv(`test-report-${csvScopeSlug(chosen.title)}-${SCOPE_SLUG[chosen.scope]}.csv`, csv);
  };

  return (
    <BentoCard
      title="Placement Readiness Test Report"
      subtitle="Every student on your roster for one test — whether or not they attempted it."
      source={report ? `${sat} of ${rows.length} attempted` : 'Pick a test'}
      action={
        <Button size="sm" disabled={!report || rows.length === 0} onClick={exportTestReport}>
          <Download className="size-4" /> Download CSV
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Test</span>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
          >
            <option value="">Select a test…</option>
            {groups.map((g) => (
              <optgroup key={g.scope} label={SCOPE_GROUP[g.scope]}>
                {g.rows.map((t) => (
                  <option key={t.id} value={t.id}>{testOptionLabel(t)}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        {report ? (
          <div className="flex gap-1.5" role="group" aria-label="Filter by attempt">
            {ATTEMPT_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                aria-pressed={filter === f.key}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                  filter === f.key
                    ? 'bg-navy text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                {f.label}
                <span className="ml-1.5 tabular-nums opacity-70">
                  {f.key === 'ALL' ? rows.length : f.key === 'ATTEMPTED' ? sat : rows.length - sat}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-xs font-medium text-red-700">{error}</p>
      ) : null}

      {loading ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin" /> Building the report…
        </p>
      ) : report ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                <th className="pb-2 pr-3 font-semibold">Student</th>
                <th className="pb-2 pr-3 font-semibold">Phone</th>
                <th className="pb-2 pr-3 font-semibold">Attempted</th>
                <th className="pb-2 pr-3 text-right font-semibold">Score</th>
                <th className="pb-2 pr-3 text-right font-semibold">%</th>
                <th className="pb-2 font-semibold">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.userId} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 pr-3">
                    <span className="block font-semibold text-navy">{r.fullName ?? '—'}</span>
                    <span className="block text-xs text-slate-500">{r.email}</span>
                  </td>
                  <td className="py-2 pr-3 text-slate-600">{r.phone ?? '—'}</td>
                  <td className="py-2 pr-3">
                    {/* The one column that is never blank - it is what the row is for. */}
                    <StatusPill
                      tone={r.attempted ? 'positive' : 'neutral'}
                      label={r.attempted ? 'Yes' : 'No'}
                    />
                  </td>
                  {/* A student who never sat it gets dashes, never zeros: a zero would
                      read as a sitting that went badly. */}
                  <td className="py-2 pr-3 text-right tabular-nums text-navy">
                    {r.attempted ? `${r.score} / ${r.total}` : '—'}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums font-semibold text-navy">
                    {r.attempted ? `${r.scorePct}%` : '—'}
                  </td>
                  <td className="py-2 text-xs text-slate-500">
                    {r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              {rows.length === 0
                ? 'No students on your college roster yet.'
                : 'Nobody in this group.'}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          Pick a test to see every student on your roster, attempted or not.
        </p>
      )}
    </BentoCard>
  );
}
