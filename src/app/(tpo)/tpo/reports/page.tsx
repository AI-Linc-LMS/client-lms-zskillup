'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, Download, FileText, GraduationCap, Loader2, Printer, School } from 'lucide-react';
import {
  getTpoAnalytics,
  getTpoCodingAnalytics,
  getTpoPlacementSummary,
} from '@/lib/api/tpo';
import type { TpoCodingAnalytics, TpoDashboard, TpoPlacementSummary } from '@/shared';
import { useTpoConsole } from '@/components/tpo/TpoConsole';
import { BentoCard } from '@/components/tpo/ui';
import { Button } from '@/components/ui/button';

const BAND_LABEL: Record<string, string> = { READY: 'Ready', IN_TRAINING: 'In training', AT_RISK: 'At risk' };

/** Minimal RFC-4180-ish CSV: quote every field, double internal quotes. */
function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const esc = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\r\n');
}

const BOM = String.fromCharCode(0xfeff); // Excel-friendly UTF-8 marker

function download(filename: string, csv: string) {
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { cohortId, cohorts } = useTpoConsole();
  const [data, setData] = useState<TpoDashboard | null>(null);
  const [coding, setCoding] = useState<TpoCodingAnalytics | null>(null);
  const [placements, setPlacements] = useState<TpoPlacementSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      getTpoAnalytics(cohortId || undefined),
      getTpoCodingAnalytics(cohortId || undefined),
      getTpoPlacementSummary(cohortId || undefined),
    ])
      .then(([d, c, p]) => {
        setData(d);
        setCoding(c);
        setPlacements(p);
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
    const rows = [...data.students]
      .sort((a, b) => b.readiness - a.readiness)
      .map((s) => [
        s.name ?? '',
        s.email,
        s.rollNumber ?? '',
        s.branch ?? '',
        s.readiness,
        s.participation,
        BAND_LABEL[s.band] ?? s.band,
        s.lastActiveDate ? new Date(s.lastActiveDate).toLocaleDateString('en-IN') : 'Never',
      ]);
    download(
      `student-report-${scope}.csv`,
      toCsv(['Name', 'Email', 'Roll No', 'Branch', 'Readiness %', 'Participation', 'Status', 'Last Active'], rows),
    );
  };

  const exportCompanies = () => {
    if (!data) return;
    const rows = data.companyReadiness.map((c) => [c.name, c.readiness, c.attempted]);
    download(`company-report-${scope}.csv`, toCsv(['Company', 'Readiness %', 'Attempts'], rows));
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
    download(`campus-report-${scope}.csv`, toCsv(['Metric', 'Value'], rows));
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-600">
          Reports &amp; exports · <span className="text-navy">{cohortId ? cohorts.find((c) => c.id === cohortId)?.name : 'All batches'}</span>
        </p>
        <Button size="sm" variant="outline" onClick={() => window.print()}>
          <Printer className="size-4" /> Print / Save as PDF
        </Button>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <ReportCard
          icon={GraduationCap}
          title="Student Report"
          desc="Every student with readiness, participation, status & last-active."
          meta={`${data?.students.length ?? 0} students`}
          onExport={exportStudents}
        />
        <ReportCard
          icon={Building2}
          title="Company Report"
          desc="Per-company readiness and attempt volume across your cohort."
          meta={`${data?.companyReadiness.length ?? 0} companies`}
          onExport={exportCompanies}
        />
        <ReportCard
          icon={School}
          title="Campus Report"
          desc="Institution-wide readiness, coding, weak areas & real placements."
          meta="Summary metrics"
          onExport={exportCampus}
        />
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
