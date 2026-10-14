'use client';

import { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import type { AssessmentResults } from '@/lib/api/scheduling';
import { BentoCard } from '@/components/tpo/ui';
import { StatusPill } from '@/components/student/StatusPill';
import { Button } from '@/components/ui/button';
import { branchShort } from '@/lib/branch';
import { csvScopeSlug, downloadCsv } from '@/lib/csv';
import { resultsCsvBody, TEST_REPORT_COLUMNS } from '@/lib/results-export-rows';
import { collegeGroupKey, groupCollegeNames } from '@/shared/college-name';
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
 * The fetcher is injected because the SAME report serves a TPO (their own college,
 * from their token) and an admin / super-admin (any college, by id) - one component,
 * two routes, so the two can never drift into showing different things.
 */
export interface PlacementReadinessReportProps {
  /** This college's Placement Readiness report. The sitting is resolved server-side
   *  from its calibration flag, so there is nothing to pick — and nothing that stops
   *  working for a cohort in which nobody has sat the test yet. */
  loadReport: () => Promise<AssessmentResults>;
}

/** Which slice of the roster the table shows. "Not attempted" is the one a placement
 *  office actually chases, so it is a first-class filter rather than a sort. */
type AttemptFilter = 'ALL' | 'ATTEMPTED' | 'NOT_ATTEMPTED';
const ATTEMPT_FILTERS: ReadonlyArray<{ key: AttemptFilter; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'ATTEMPTED', label: 'Attempted' },
  { key: 'NOT_ATTEMPTED', label: 'Not attempted' },
];

/** The value every dropdown uses for "no filter" — '' is also what an empty cell
 *  normalises to, so a sentinel keeps "All" apart from "students with no branch". */
const ANY = '__any__';

const eyebrow = 'text-[10px] font-semibold uppercase tracking-widest text-slate-400';
const selectCls =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30';

/** Distinct values of one row field, with how many rows carry each, name-sorted. Used
 *  for Department and Cohort; College goes through groupCollegeNames instead, because
 *  its values are partly free text and the same college arrives spelled several ways. */
function countBy<T>(
  rows: readonly T[],
  pick: (r: T) => string | null | undefined,
): Array<{ value: string; label: string; count: number }> {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const v = pick(r);
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * THE PLACEMENT READINESS REPORT - one college's whole roster against one test.
 *
 * Per student: identity, timings, marks, and a score/max pair for every section of the
 * paper (generated from the paper, never hard-coded), plus whether they sat it at all.
 *
 * There is NO test picker. It had one, and the owner asked for it to go — rightly: a
 * picker can only offer drives a college owns or has already attended, so a cohort in
 * which nobody had sat the Placement Readiness Test had nothing to select, and the
 * report whose whole purpose is showing who has NOT taken it was the one report a new
 * cohort could not open. The sitting is resolved server-side from its calibration flag
 * instead, which is both simpler to use and correct from a cohort's first day.
 */
export function PlacementReadinessReport({ loadReport }: PlacementReadinessReportProps) {
  const [report, setReport] = useState<AssessmentResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AttemptFilter>('ALL');
  // Three identity filters, because "who has not taken it" is only an actionable
  // question once it is narrowed to a group somebody owns — a department head, a
  // college's TPO, a cohort's trainer.
  const [branch, setBranch] = useState<string>(ANY);
  const [college, setCollege] = useState<string>(ANY);
  const [cohort, setCohort] = useState<string>(ANY);
  const [error, setError] = useState<string | null>(null);

  // The report IS the section, so it loads on mount rather than on a click: the whole
  // point is that a placement officer reads the cohort without first downloading it.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setFilter('ALL');
    setBranch(ANY);
    setCollege(ANY);
    setCohort(ANY);
    loadReport()
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
  }, [loadReport]);

  const rows = report?.rows ?? [];

  // Options come from the rows themselves, so a filter can never offer a group that
  // would come back empty. Colleges are GROUPED by name rather than listed raw: the
  // same college arrives as "AIT college", "AIT College", "ait" — one dropdown entry
  // per college, not one per spelling.
  const branchOptions = countBy(rows, (r) => branchShort(r.branch));
  const cohortOptions = countBy(rows, (r) => r.cohort);
  const collegeOptions = groupCollegeNames(rows, (r) => r.collegeName);

  // Identity first, attempted/not second — so the attempt pills can show counts WITHIN
  // the chosen group, which is the number anyone chasing a department actually wants.
  const scoped = rows.filter(
    (r) =>
      (branch === ANY || branchShort(r.branch) === branch) &&
      (cohort === ANY || r.cohort === cohort) &&
      (college === ANY || collegeGroupKey(r.collegeName) === college),
  );
  const sat = scoped.filter((r) => r.attempted).length;
  const shown = scoped.filter((r) =>
    filter === 'ALL' ? true : filter === 'ATTEMPTED' ? r.attempted : !r.attempted,
  );
  const filtered = branch !== ANY || college !== ANY || cohort !== ANY || filter !== 'ALL';

  const clearFilters = () => {
    setBranch(ANY);
    setCollege(ANY);
    setCohort(ANY);
    setFilter('ALL');
  };

  const exportTestReport = () => {
    if (!report) return;
    // Same generator as the results-modal export - only the fixed columns differ
    // (Email and Attempted Status in, proctoring out), which is a parameter, not a
    // second implementation. The file is exactly the table above it: the CSV carries
    // the FILTERED rows, so "download the ECE students who have not taken it" is one
    // action rather than an export plus a spreadsheet pass.
    const csv = resultsCsvBody({ ...report, rows: shown }, TEST_REPORT_COLUMNS);
    if (!csv) {
      setError(
        filtered
          ? 'No students match these filters, so there is nothing to export.'
          : 'There is no student on your college roster to report on yet.',
      );
      return;
    }
    const scopeName =
      college !== ANY
        ? csvScopeSlug(collegeOptions.find((c) => c.key === college)?.label ?? 'college')
        : 'my-college';
    downloadCsv(`${csvScopeSlug(report.assessment.title)}-${scopeName}.csv`, csv);
  };

  return (
    <BentoCard
      title="Placement Readiness Test Report"
      subtitle="Every student on your roster — whether or not they attempted the test."
      source={report ? `${sat} of ${scoped.length} attempted` : 'Loading'}
      action={
        <Button size="sm" disabled={!report || rows.length === 0} onClick={exportTestReport}>
          <Download className="size-4" /> Download CSV
        </Button>
      }
    >
      {report ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="pr-college" className={eyebrow}>
              College
            </label>
            <select
              id="pr-college"
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              className={cn(selectCls, 'mt-1.5')}
            >
              <option value={ANY}>All colleges ({rows.length})</option>
              {collegeOptions.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label} ({c.count})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pr-branch" className={eyebrow}>
              Department
            </label>
            <select
              id="pr-branch"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className={cn(selectCls, 'mt-1.5')}
            >
              <option value={ANY}>All departments</option>
              {branchOptions.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label} ({b.count})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pr-cohort" className={eyebrow}>
              Cohort
            </label>
            <select
              id="pr-cohort"
              value={cohort}
              onChange={(e) => setCohort(e.target.value)}
              className={cn(selectCls, 'mt-1.5')}
            >
              <option value={ANY}>All cohorts</option>
              {cohortOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label} ({c.count})
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
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
                  {f.key === 'ALL'
                    ? scoped.length
                    : f.key === 'ATTEMPTED'
                      ? sat
                      : scoped.length - sat}
                </span>
              </button>
            ))}
          </div>
        ) : null}
        {filtered ? (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
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
                <th className="pb-2 pr-3 font-semibold">Branch</th>
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
                  {/* Identity, like the name and phone — so an absentee still shows it.
                      Blank where the student has not given it; a guess would be worse
                      than a gap. */}
                  <td className="py-2 pr-3 text-slate-600">{branchShort(r.branch) || '—'}</td>
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
