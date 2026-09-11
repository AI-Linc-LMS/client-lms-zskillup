'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Download, Loader2, Search } from 'lucide-react';
import {
  getTpoAnalytics,
  getTpoCompanyHeatmap,
  getTpoCompanyReadinessStudents,
} from '@/lib/api/tpo';
import { listCompanies } from '@/lib/api/catalog';
import type { TpoCompanyHeatmap, TpoCompanyReadinessReport, TpoDashboard } from '@/shared';
import { useTpoConsole } from '@/components/tpo/TpoConsole';
import { BentoCard } from '@/components/tpo/ui';
import { CompanyHeatmap } from '@/components/tpo/CompanyHeatmap';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toCsv } from '@/lib/csv';

const BOM = String.fromCharCode(0xfeff);
function download(filename: string, csv: string) {
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });

const scoreBg = (v: number | null) =>
  v == null
    ? 'bg-slate-50 text-slate-500 ring-slate-200'
    : v >= 70
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : v >= 50
        ? 'bg-amber-50 text-amber-700 ring-amber-200'
        : 'bg-rose-50 text-rose-700 ring-rose-200';
function Pill({ value }: { value: number | null }) {
  return (
    <span className={cn('inline-flex min-w-[3rem] justify-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 tabular-nums', scoreBg(value))}>
      {value == null ? '—' : `${value}%`}
    </span>
  );
}

export default function CompanyReadinessPage() {
  const { cohortId, cohorts } = useTpoConsole();
  const [data, setData] = useState<TpoDashboard | null>(null);
  const [heatmap, setHeatmap] = useState<TpoCompanyHeatmap | null>(null);
  const [companies, setCompanies] = useState<Array<{ slug: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Student-level report state (#7).
  const [selected, setSelected] = useState('');
  const [report, setReport] = useState<TpoCompanyReadinessReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [q, setQ] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([getTpoAnalytics(cohortId || undefined), getTpoCompanyHeatmap(cohortId || undefined)])
      .then(([d, h]) => {
        setData(d);
        setHeatmap(h);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load company readiness'))
      .finally(() => setLoading(false));
  }, [cohortId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    void listCompanies()
      .then((cs) => setCompanies(cs.map((c) => ({ slug: c.slug, name: c.name }))))
      .catch(() => setCompanies([]));
  }, []);

  useEffect(() => {
    if (!selected) {
      setReport(null);
      return;
    }
    let alive = true;
    setReportLoading(true);
    getTpoCompanyReadinessStudents(selected, cohortId || undefined)
      .then((r) => alive && setReport(r))
      .catch(() => alive && setReport(null))
      .finally(() => alive && setReportLoading(false));
    return () => {
      alive = false;
    };
  }, [selected, cohortId]);

  const cohortLabel = cohortId ? cohorts.find((c) => c.id === cohortId)?.name ?? 'Batch' : 'All batches';

  const rows = useMemo(() => {
    const list = report?.students ?? [];
    const needle = q.trim().toLowerCase();
    return needle
      ? list.filter((s) => (s.name ?? '').toLowerCase().includes(needle) || s.email.toLowerCase().includes(needle))
      : list;
  }, [report, q]);

  const exportReport = () => {
    if (!report) return;
    const label = report.company.name;
    const csvRows = report.students.map((s) => [
      s.name ?? '',
      s.email,
      s.readiness,
      s.accuracy,
      s.attempted,
      s.easy,
      s.medium,
      s.hard,
      s.topicsPracticed.join('; '),
      s.lastActiveAt ? fmtDate(s.lastActiveAt) : '',
      s.lastActiveAt ? fmtTime(s.lastActiveAt) : '',
    ]);
    download(
      `company-readiness-${report.company.slug}.csv`,
      toCsv(
        [
          'Student Name',
          'Email',
          `${label} Readiness %`,
          'Accuracy',
          'Questions Attempted',
          'Easy',
          'Medium',
          'Hard',
          'Topics Practiced',
          'Last Active Date',
          'Last Active Time',
        ],
        csvRows,
      ),
    );
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

  const companyName = report?.company.name ?? companies.find((c) => c.slug === selected)?.name ?? 'company';

  return (
    <div className="space-y-6">
      <ConsoleHero
        icon={Building2}
        eyebrow="Placement Office"
        title="Company Readiness"
        description="How your students stack up against each recruiter's bar - company by company."
        actions={
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/80 ring-1 ring-inset ring-white/15">
            {cohortLabel}
          </span>
        }
      />

      <BentoCard
        title="Company Readiness Heatmap"
        subtitle="How your students are distributed across readiness bands, per recruiter."
        source="Company-tagged practice accuracy"
      >
        <CompanyHeatmap rows={heatmap?.rows ?? []} />
      </BentoCard>

      <BentoCard
        title="Student-level Company Readiness"
        subtitle="Pick a company to see each student's readiness, accuracy and volume on that company's problems — then export."
        source="Company-tagged coding practice"
      >
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Company</span>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
            >
              <option value="">Select a company…</option>
              {companies.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </label>
          {report ? (
            <>
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 sm:max-w-xs">
                <Search className="size-4 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search student…"
                  className="w-full bg-transparent text-sm text-navy outline-none placeholder:text-slate-400"
                />
              </div>
              <Button size="sm" onClick={exportReport} disabled={report.students.length === 0} className="ml-auto">
                <Download className="size-4" /> Export CSV
              </Button>
            </>
          ) : null}
        </div>

        {!selected ? (
          <p className="py-8 text-center text-sm text-slate-500">Select a company above to view student-level readiness.</p>
        ) : reportLoading ? (
          <div className="flex items-center justify-center py-12 text-slate-400"><Loader2 className="size-6 animate-spin" /></div>
        ) : !report || report.students.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No students have attempted {companyName}'s coding problems yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[56rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] text-slate-400">
                  <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide">Student</th>
                  <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide">{companyName} Readiness</th>
                  <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide">Accuracy</th>
                  <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide">Attempted</th>
                  <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-emerald-600">Easy</th>
                  <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-amber-600">Med</th>
                  <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-rose-600">Hard</th>
                  <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide">Topics</th>
                  <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 align-top last:border-0 hover:bg-slate-50/60">
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-navy">{s.name ?? 'Unnamed student'}</p>
                      <p className="text-[11px] text-slate-500">{s.email}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right"><Pill value={s.readiness} /></td>
                    <td className="px-3 py-2.5 text-right"><Pill value={s.accuracy} /></td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{s.attempted}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-emerald-600">{s.easy}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-amber-600">{s.medium}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-rose-600">{s.hard}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex max-w-[16rem] flex-wrap gap-1">
                        {s.topicsPracticed.slice(0, 6).map((t) => (
                          <span key={t} className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-violet-100">{t}</span>
                        ))}
                        {s.topicsPracticed.length > 6 ? <span className="text-[10px] text-slate-400">+{s.topicsPracticed.length - 6}</span> : null}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right text-[11px] text-slate-500">
                      {s.lastActiveAt ? (
                        <>
                          {fmtDate(s.lastActiveAt)}
                          <span className="block text-slate-400">{fmtTime(s.lastActiveAt)}</span>
                        </>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-sm text-slate-500">No students match “{q}”.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </BentoCard>
    </div>
  );
}
