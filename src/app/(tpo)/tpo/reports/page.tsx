'use client';

import { useCallback, useEffect, useState } from 'react';
import { ClipboardList, Download, FileText, GraduationCap, Loader2, Printer, School, Target } from 'lucide-react';
import {
  getTpoAnalytics,
  getTpoCodingAnalytics,
  getTpoCodingStudents,
  getTpoCompanyReadinessStudents,
  getTpoInterviewAnalytics,
  getTpoPlacementSummary,
  getTpoAssessmentResults,
  getTpoReportableAssessments,
} from '@/lib/api/tpo';
import { listCompanies } from '@/lib/api/catalog';
import type {
  TpoCodingAnalytics,
  TpoCodingStudentRow,
  TpoDashboard,
  TpoInterviewAnalytics,
  TpoPlacementSummary,
  TpoReportableAssessment,
} from '@/shared';
import { useTpoConsole } from '@/components/tpo/TpoConsole';
import { BentoCard } from '@/components/tpo/ui';
import {
  ACTIVITY_SCORE_CAPTION,
  ACTIVITY_SCORE_CSV_HEADER,
} from '@/components/tpo/activity-score';
import { companyReadinessCsv } from '@/components/tpo/CompanyReadinessTable';
import { Button } from '@/components/ui/button';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { csvScopeSlug, downloadCsv, toCsv } from '@/lib/csv';
import { resultsCsvBody, TEST_REPORT_COLUMNS } from '@/lib/results-export-rows';

const BAND_LABEL: Record<string, string> = { READY: 'Ready', IN_TRAINING: 'In training', AT_RISK: 'At risk' };

export default function ReportsPage() {
  const { cohortId, cohorts } = useTpoConsole();
  const [data, setData] = useState<TpoDashboard | null>(null);
  const [coding, setCoding] = useState<TpoCodingAnalytics | null>(null);
  const [placements, setPlacements] = useState<TpoPlacementSummary | null>(null);
  // For the student report's Interview / Coding readiness columns (#6).
  const [interview, setInterview] = useState<TpoInterviewAnalytics | null>(null);
  const [codingStudents, setCodingStudents] = useState<TpoCodingStudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      getTpoAnalytics(cohortId || undefined),
      getTpoCodingAnalytics(cohortId || undefined),
      getTpoPlacementSummary(cohortId || undefined),
      getTpoInterviewAnalytics(cohortId || undefined),
      getTpoCodingStudents(cohortId || undefined),
    ])
      .then(([d, c, p, iv, cs]) => {
        setData(d);
        setCoding(c);
        setPlacements(p);
        setInterview(iv);
        setCodingStudents(cs);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load reports'))
      .finally(() => setLoading(false));
  }, [cohortId]);

  useEffect(() => {
    load();
  }, [load]);

  const scope = (cohortId ? cohorts.find((c) => c.id === cohortId)?.name ?? 'batch' : 'all-batches')
    .toLowerCase()
    .replace(/\s+/g, '-');

  const exportStudents = () => {
    if (!data) return;
    // Per-student interview + coding readiness, joined by id.
    const interviewById = new Map((interview?.students ?? []).map((s) => [s.id, s.readiness]));
    const codingById = new Map(codingStudents.map((s) => [s.id, s.codingReadiness]));
    // Text-formatted date/time (IST) so Excel never renders a numeric date as ########.
    const fmtDate = (iso: string) =>
      new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
    const fmtTime = (iso: string) =>
      new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
    const rows = [...data.students]
      .sort((a, b) => b.readiness - a.readiness)
      .map((s) => {
        const lastDate = s.lastActiveAt ? fmtDate(s.lastActiveAt) : s.lastActiveDate ? fmtDate(s.lastActiveDate) : 'Never';
        const lastTime = s.lastActiveAt ? fmtTime(s.lastActiveAt) : '';
        return [
          s.name ?? '',
          s.email,
          s.rollNumber ?? '',
          s.branch ?? '',
          s.readiness,
          interviewById.get(s.id) ?? '',
          codingById.get(s.id) ?? '',
          s.participation,
          s.practiceAnswered,
          s.mocksCompleted,
          s.codingProblems,
          BAND_LABEL[s.band] ?? s.band,
          lastDate,
          lastTime,
        ];
      });
    downloadCsv(
      `student-report-${scope}.csv`,
      toCsv(
        [
          'Name',
          'Email',
          'Roll No',
          'Branch',
          'Placement Readiness',
          'Interview Readiness',
          'Coding Readiness',
          ACTIVITY_SCORE_CSV_HEADER,
          'Practice Answers',
          'Mock Attempts',
          'Coding Problems',
          'Status',
          'Last Active Date',
          'Last Active Time',
        ],
        rows,
      ),
    );
  };

  const exportCampus = () => {
    if (!data) return;
    const o = data.overview;
    const rows: (string | number)[][] = [
      ['Total students', o.totalStudents],
      ['Active (14d)', o.activeStudents],
      ['Placement-ready (readiness ≥70)', o.placementReady],
      ['Average readiness %', o.avgReadiness],
      ['At-risk', o.atRisk],
      ['Coding solve rate %', coding?.solveRate ?? 0],
      ['Problems solved', coding?.totalSolved ?? 0],
      ['Students placed (real offers)', placements?.studentsPlaced ?? 0],
      ['Placement rate %', placements?.placementRatePct ?? 0],
      ['Average CTC (LPA)', placements?.avgCtcLpa ?? ''],
      ['Highest CTC (LPA)', placements?.highestCtcLpa ?? ''],
      ...data.skillGaps.map((g) => [`Weak topic: ${g.topic}`, `${g.accuracy}%`]),
    ];
    downloadCsv(`campus-report-${scope}.csv`, toCsv(['Metric', 'Value'], rows));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-7 animate-spin text-slate-500" />
      </div>
    );
  }
  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>;
  }

  return (
    <div className="space-y-5">
      <ConsoleHero
        icon={FileText}
        eyebrow="Placement Office"
        title="Reports & Exports"
        description="Download student, test, campus and per-recruiter CSVs, or print a placement snapshot for your college."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/70 ring-1 ring-inset ring-white/15">
              {cohortId ? cohorts.find((c) => c.id === cohortId)?.name : 'All batches'}
            </span>
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer className="size-4" /> Print / Save as PDF
            </Button>
          </div>
        }
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <ReportCard
          icon={GraduationCap}
          title="Student Report"
          desc={`Every student with readiness, Activity Score (${ACTIVITY_SCORE_CAPTION}), status & last-active.`}
          meta={`${data?.students.length ?? 0} students`}
          onExport={exportStudents}
        />
        <TestReportCard />
        <ReportCard
          icon={School}
          title="Campus Report"
          desc="Institution-wide readiness, coding, weak areas & real placements."
          meta="Summary metrics"
          onExport={exportCampus}
        />
        <CompanyReadinessReportCard scope={scope} cohortId={cohortId} />
      </div>

      <BentoCard title="At a glance" subtitle="What the campus report contains." source="Practice + Mock + Coding + placements">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Glance label="Students" value={data?.overview.totalStudents ?? 0} />
          <Glance label="Avg readiness" value={`${data?.overview.avgReadiness ?? 0}%`} />
          <Glance label="Coding solve rate" value={`${coding?.solveRate ?? 0}%`} />
          <Glance label="Placed (real)" value={placements?.studentsPlaced ?? 0} />
        </div>
      </BentoCard>
    </div>
  );
}

/** The drive the owner asks for by name - selected by default whenever it is there. */
const DEFAULT_TEST_TITLE = 'placement readiness test';

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
function TestReportCard() {
  const [tests, setTests] = useState<TpoReportableAssessment[]>([]);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getTpoReportableAssessments()
      .then((rows) => {
        setTests(rows);
        // The owner asks for this report by the test’s name; fall back to the most
        // recent drive (the list arrives newest first) so the card is never empty-handed.
        const named = rows.find((r) => r.title.trim().toLowerCase() === DEFAULT_TEST_TITLE);
        setSelected(named?.id ?? rows[0]?.id ?? '');
      })
      .catch(() => setTests([]));
  }, []);

  const chosen = tests.find((t) => t.id === selected) ?? null;
  const groups = (['OWN', 'ATTEMPTED'] as const)
    .map((scope) => ({ scope, rows: tests.filter((t) => t.scope === scope) }))
    .filter((g) => g.rows.length > 0);

  const exportTestReport = async () => {
    if (!chosen) return;
    setBusy(true);
    setError(null);
    try {
      const report = await getTpoAssessmentResults(chosen.id);
      // Same generator as the results-modal export - only the fixed columns differ
      // (Email in, proctoring out), which is a parameter, not a second implementation.
      const csv = resultsCsvBody(report, TEST_REPORT_COLUMNS);
      if (!csv) {
        setError('No student from your college has a submitted attempt on this test yet.');
        return;
      }
      downloadCsv(
        `test-report-${csvScopeSlug(chosen.title)}-${SCOPE_SLUG[chosen.scope]}.csv`,
        csv,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not build that report.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5">
      <span className="grid size-11 place-items-center rounded-2xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
        <ClipboardList className="size-5" />
      </span>
      <h2 className="mt-3 text-base font-black text-navy">Placement Readiness Test Report</h2>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-600">
        One row per student for a single test - name, email, phone, start and submit times,
        marks out of the maximum, percentage, questions attempted, and a score plus maximum
        for every section of that paper.
      </p>
      <label className="mt-3 block">
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
      {chosen ? (
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {chosen.scope === 'OWN'
            ? `Your drive · all ${chosen.collegeAttempts} attempt${chosen.collegeAttempts === 1 ? '' : 's'}`
            : `Attempted by your students · your ${chosen.collegeAttempts} student${chosen.collegeAttempts === 1 ? '' : 's'} only`}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-[11px] font-medium text-red-700">{error}</p>
      ) : null}
      <Button
        size="sm"
        className="mt-3 w-full"
        disabled={!selected || busy}
        onClick={() => void exportTestReport()}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
        Download CSV
      </Button>
    </div>
  );
}

/**
 * Company Readiness export - the roster-wide, per-recruiter student report, reachable
 * from Reports & Exports as well as its own console page (a TPO who lives in this
 * screen had no way to discover it). Picking a company fetches and downloads in one
 * step; the CSV is byte-identical to the one the Company Readiness page produces.
 */
function CompanyReadinessReportCard({ scope, cohortId }: { scope: string; cohortId: string | null }) {
  const [companies, setCompanies] = useState<Array<{ slug: string; name: string }>>([]);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listCompanies()
      .then((cs) => setCompanies(cs.map((c) => ({ slug: c.slug, name: c.name }))))
      .catch(() => setCompanies([]));
  }, []);

  const exportCompanyReadiness = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const report = await getTpoCompanyReadinessStudents(selected, cohortId || undefined);
      downloadCsv(
        `company-readiness-${report.company.slug}-${scope}.csv`,
        companyReadinessCsv(report),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not build that report.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5">
      <span className="grid size-11 place-items-center rounded-2xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
        <Target className="size-5" />
      </span>
      <h2 className="mt-3 text-base font-black text-navy">Company Readiness Report</h2>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-600">
        Every student scored against one recruiter - readiness, accuracy, questions attempted,
        difficulty split, topics and last activity.
      </p>
      <label className="mt-3 block">
        <span className="sr-only">Company</span>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
        >
          <option value="">Select a company…</option>
          {companies.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </label>
      {error ? (
        <p role="alert" className="mt-2 text-[11px] font-medium text-red-700">{error}</p>
      ) : null}
      <Button
        size="sm"
        className="mt-3 w-full"
        disabled={!selected || busy}
        onClick={() => void exportCompanyReadiness()}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
        Download CSV
      </Button>
    </div>
  );
}

function ReportCard({
  icon: Icon,
  title,
  desc,
  meta,
  onExport,
}: {
  icon: typeof FileText;
  title: string;
  desc: string;
  meta: string;
  onExport: () => void;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5">
      <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-[#ffd24d] to-[#f5b400] text-[#171717]">
        <Icon className="size-5" />
      </span>
      <h2 className="mt-3 text-base font-black text-navy">{title}</h2>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-600">{desc}</p>
      <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{meta}</p>
      <Button size="sm" className="mt-3 w-full" onClick={onExport}>
        <Download className="size-4" /> Download CSV
      </Button>
    </div>
  );
}

function Glance({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
      <p className="text-xl font-black tabular-nums text-navy">{typeof value === 'number' ? value.toLocaleString('en-IN') : value}</p>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}
