'use client';

import { useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Building2, Download, Loader2, School } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAdminStats, getAdminCompanyStats, type AdminPlatformStats, type AdminCompanyStat } from '@/lib/api/admin';

const BOM = String.fromCharCode(0xfeff);
function toCsv(headers: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\r\n');
}
function download(name: string, csv: string) {
  const url = URL.createObjectURL(new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Reports (ADMIN). Platform + Company reports are ADMIN-accessible; the Financial
 * report only appears for ADMINs with the financials capability (payments is a
 * SUPER_ADMIN endpoint) — it degrades gracefully otherwise.
 */
export default function AdminReportsPage() {
  const [stats, setStats] = useState<AdminPlatformStats | null>(null);
  const [companies, setCompanies] = useState<AdminCompanyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getAdminStats(), getAdminCompanyStats()])
      .then(([s, c]) => {
        setStats(s);
        setCompanies(c);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load report data'))
      .finally(() => setLoading(false));
  }, []);

  const exportPlatform = () => {
    if (!stats) return;
    const rows: [string, number][] = [
      ['Total students', stats.students],
      ['Total colleges', stats.colleges],
      ['Companies', stats.companies],
      ['Courses', stats.courses],
      ['Questions published', stats.questionsPublished],
      ['Questions total', stats.questionsTotal],
      ['Mock tests', stats.mockTests],
      ['Mock attempts', stats.mockAttempts],
      ['Practice attempts', stats.practiceAttempts],
      ['Admins', stats.admins ?? 0],
      ['Verified students', stats.verifiedStudents ?? 0],
      ['New students (7d)', stats.newStudents7d ?? 0],
      ['New students (30d)', stats.newStudents30d ?? 0],
      ['Adaptive sessions', stats.adaptiveSessions ?? 0],
      ['Active today (DAU)', stats.dau ?? 0],
      ['Active students (14d)', stats.activeStudents ?? 0],
      ['Active colleges (14d)', stats.activeColleges ?? 0],
      ['Assessments conducted', stats.assessmentsConducted ?? 0],
      ['Coding problems solved', stats.codingSolved ?? 0],
      ['Interview sessions', stats.interviewSessions ?? 0],
    ];
    download('platform-report.csv', toCsv(['Metric', 'Value'], rows));
  };


  const exportCompanies = () => {
    const rows = companies.map((c) => [c.name, c.slug, c.registrations, c.assessments, c.questionCount, c.codingCount]);
    download('company-report.csv', toCsv(['Company', 'Slug', 'Registrations', 'Assessments', 'MCQ bank', 'Coding bank'], rows));
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Platform Admin', href: '/admin/dashboard' }, { label: 'Reports' }]} />
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Insights</p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">Reports &amp; Exports</h1>
        <p className="mt-1 text-sm text-slate-500">Platform and company reports - download as CSV.</p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="size-7 animate-spin text-slate-400" /></div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
      ) : (
        <div className="grid gap-5 md:grid-cols-3">
          <ReportCard
            icon={School}
            title="Platform Report"
            desc="Institution-wide totals - students, colleges, content, activity."
            meta={`${stats?.students ?? 0} students · ${stats?.colleges ?? 0} colleges`}
            onExport={exportPlatform}
          />
          <ReportCard
            icon={Building2}
            title="Company Report"
            desc="Per-company registrations, drives, and bank coverage."
            meta={`${companies.length} companies`}
            onExport={exportCompanies}
          />
        </div>
      )}
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
  icon: typeof School;
  title: string;
  desc: string;
  meta: string;
  onExport: () => void;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5">
      <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-[#ffd24d] to-[#f5b400] text-[#171717]">
        <Icon className="size-5" />
      </span>
      <h2 className="mt-3 text-base font-black text-navy">{title}</h2>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-500">{desc}</p>
      <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{meta}</p>
      <Button size="sm" className="mt-3 w-full" onClick={onExport}>
        <Download className="size-4" /> Download CSV
      </Button>
    </div>
  );
}
