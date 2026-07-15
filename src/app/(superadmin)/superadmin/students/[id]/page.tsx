'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { getStudentReport, type AdminStudentFullReport } from '@/lib/api/admin';
import { Panel, StatCard } from '@/components/superadmin/dashboard-ui';
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  Brain,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  Mail,
  Phone,
  Target,
  Timer,
  Trophy,
} from 'lucide-react';

function pctTone(pct: number | null): string {
  if (pct === null) return 'text-slate-500';
  if (pct >= 70) return 'text-emerald-600';
  if (pct >= 40) return 'text-amber-600';
  return 'text-red-500';
}

function fmtDateTime(d: string | null): string {
  if (!d) return '-';
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function fmtDuration(sec: number | null): string {
  if (sec === null || sec === 0) return '-';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

const STATUS_BADGE: Record<string, string> = {
  SUBMITTED: 'bg-emerald-50 text-emerald-700',
  EXPIRED: 'bg-amber-50 text-amber-700',
  IN_PROGRESS: 'bg-blue-50 text-blue-700',
};

export default function StudentReportPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [report, setReport] = useState<AdminStudentFullReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getStudentReport(id)
      .then((r) => !cancelled && setReport(r))
      .catch(() => !cancelled && setError('Could not load this student report.'));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Student Reports', href: '/superadmin/students' },
            { label: 'Report' },
          ]}
        />
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-20">
        <Loader2 className="size-6 animate-spin text-slate-500" />
      </div>
    );
  }

  const { student, summary, mockAttempts } = report;
  const practicePct =
    summary.practiceAttempts > 0
      ? Math.round((summary.practiceCorrect / summary.practiceAttempts) * 100)
      : null;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Student Reports', href: '/superadmin/students' },
          { label: student.fullName ?? student.email },
        ]}
      />

      <Link
        href="/superadmin/students"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-navy"
      >
        <ArrowLeft className="size-4" /> All students
      </Link>

      {/* Student header */}
      <div className="relative overflow-hidden rounded-3xl bg-[#1a1a1a] p-7 text-white">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[#ffc42d]/25 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-white/10 text-2xl font-extrabold">
              {(student.fullName ?? student.email).charAt(0).toUpperCase()}
            </span>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">
                {student.fullName ?? 'Unnamed student'}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/70">
                <span className="flex items-center gap-1.5">
                  <Mail className="size-3.5" /> {student.email}
                  {student.isEmailVerified && <BadgeCheck className="size-3.5 text-emerald-300" />}
                </span>
                {student.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="size-3.5" /> {student.phone}
                  </span>
                )}
                {student.collegeName && (
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="size-3.5" /> {student.collegeName}
                    {student.passoutYear ? ` · ${student.passoutYear}` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className="rounded-full border border-white/15 bg-white/[0.08] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white/80">
            {student.status}
          </span>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Quizzes taken"
          value={summary.totalAttempts}
          icon={<Timer className="size-4" />}
          accent="#f5b400"
        />
        <StatCard
          label="Avg score"
          value={summary.avgScorePct === null ? '-' : `${summary.avgScorePct}%`}
          icon={<Target className="size-4" />}
          accent="#f5b400"
        />
        <StatCard
          label="Best score"
          value={summary.bestScorePct === null ? '-' : `${summary.bestScorePct}%`}
          icon={<Trophy className="size-4" />}
          accent="#059669"
        />
        <StatCard
          label="Time on tests"
          value={fmtDuration(summary.totalTimeSec)}
          icon={<Clock className="size-4" />}
          accent="#7c3aed"
        />
        <StatCard
          label="Practice"
          value={practicePct === null ? '-' : `${practicePct}%`}
          sub={`${summary.practiceCorrect}/${summary.practiceAttempts} correct`}
          icon={<CheckCircle2 className="size-4" />}
          accent="#0ea5e9"
        />
        <StatCard
          label="Adaptive"
          value={summary.adaptiveSessions}
          icon={<Brain className="size-4" />}
          accent="#db2777"
        />
      </div>

      {/* Quiz attempts table */}
      <Panel
        title="Quiz attempts"
        action={<span className="text-xs text-slate-500">{mockAttempts.length} total</span>}
      >
        {mockAttempts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Award className="size-7 text-slate-400" />
            <p className="text-sm text-slate-500">This student hasn&apos;t attempted any quiz yet.</p>
          </div>
        ) : (
          <div className="-mx-5 -mb-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-y border-slate-100 bg-slate-50/60 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-5 py-3">Quiz</th>
                  <th className="px-5 py-3 text-center">Marks</th>
                  <th className="px-5 py-3 text-center">Score</th>
                  <th className="px-5 py-3 text-center">Percentile</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Submitted</th>
                  <th className="px-5 py-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mockAttempts.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-medium text-navy">{a.mockTitle}</td>
                    <td className="px-5 py-3 text-center text-slate-600">
                      {a.score === null || a.total === null ? '-' : `${a.score} / ${a.total}`}
                    </td>
                    <td className={`px-5 py-3 text-center font-bold ${pctTone(a.percentage)}`}>
                      {a.percentage === null ? '-' : `${a.percentage}%`}
                    </td>
                    <td className="px-5 py-3 text-center text-slate-600">
                      {a.percentile === null ? '-' : a.percentile}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          STATUS_BADGE[a.status] ?? 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {a.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">{fmtDateTime(a.submittedAt)}</td>
                    <td className="px-5 py-3 text-right text-xs text-slate-600">
                      {fmtDuration(a.timeTakenSec)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
