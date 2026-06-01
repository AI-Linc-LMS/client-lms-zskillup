import { Breadcrumb } from '@/components/layout/Breadcrumb';
import Link from 'next/link';
import { CalendarDays, Clock, FileText, Trophy, BarChart3, CheckCircle2 } from 'lucide-react';

const CRUMBS = [
  { label: 'Home', href: '/' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Mock Tests' },
];

const KPI_CARDS = [
  { label: 'Tests Taken', value: '4', icon: FileText },
  { label: 'Avg Score', value: '74%', icon: BarChart3 },
  { label: 'Best Rank', value: '#228', icon: Trophy },
];

const UPCOMING_MOCKS = [
  {
    id: 1,
    company: 'TCS NQT',
    date: 'Wed, 4 Jun 2026',
    time: '10:00 AM',
    duration: '90 min',
    questions: 100,
    registered: true,
    logoInitial: 'T',
  },
  {
    id: 2,
    company: 'Wipro NLTH',
    date: 'Sat, 7 Jun 2026',
    time: '2:00 PM',
    duration: '60 min',
    questions: 75,
    registered: false,
    logoInitial: 'W',
  },
];

const PAST_RESULTS = [
  {
    id: 1,
    name: 'TCS NQT Full Mock #2',
    date: '22 May 2026',
    score: '82%',
    percentile: '91st',
    rank: '#312',
    status: 'Completed',
  },
  {
    id: 2,
    name: 'Infosys InfyTQ Mock #1',
    date: '14 May 2026',
    score: '71%',
    percentile: '74th',
    rank: '#891',
    status: 'Completed',
  },
  {
    id: 3,
    name: 'Wipro NLTH Prep Mock',
    date: '6 May 2026',
    score: '68%',
    percentile: '62nd',
    rank: '#1,204',
    status: 'Completed',
  },
  {
    id: 4,
    name: 'TCS NQT Full Mock #1',
    date: '28 Apr 2026',
    score: '79%',
    percentile: '85th',
    rank: '#487',
    status: 'Completed',
  },
];

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'In progress': 'bg-sky-50 text-sky-700 border-sky-200',
    Pending: 'bg-amber-50 text-amber-700 border-amber-200',
    Overdue: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[status] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}
    >
      {status}
    </span>
  );
}

export default function MockTestsPage() {
  return (
    <div>
      {/* Breadcrumb + top bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Breadcrumb items={CRUMBS} />
          <h1 className="text-xl font-bold text-navy">Mock Tests</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Timed assessments with percentile reports and placement readiness signals.
          </p>
        </div>
        <Link
          href="/dashboard/quiz?mode=practice"
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-orange px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
        >
          <FileText className="size-4" aria-hidden="true" />
          Take Practice Mock
        </Link>
      </div>

      {/* KPI row */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {KPI_CARDS.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {label}
            </p>
            <div className="mt-2 flex items-end justify-between">
              <span className="text-[26px] font-extrabold text-navy leading-none">
                {value}
              </span>
              <span className="flex size-9 items-center justify-center rounded-lg bg-sky-50 text-navy">
                <Icon className="size-5" aria-hidden="true" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming Mocks */}
      <section className="mb-8">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Upcoming Mocks
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {UPCOMING_MOCKS.map((mock) => (
            <div
              key={mock.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-navy text-sm font-bold text-white">
                    {mock.logoInitial}
                  </span>
                  <div>
                    <p className="font-bold text-navy">{mock.company}</p>
                    <p className="text-xs text-slate-400">Full Mock Assessment</p>
                  </div>
                </div>
                {mock.registered ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="size-3" aria-hidden="true" />
                    Registered
                  </span>
                ) : (
                  <button
                    type="button"
                    className="shrink-0 rounded-full bg-orange px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
                  >
                    Register
                  </button>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5">
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <CalendarDays className="size-3.5 text-slate-400" aria-hidden="true" />
                  {mock.date} Â· {mock.time}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="size-3.5 text-slate-400" aria-hidden="true" />
                  {mock.duration}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <FileText className="size-3.5 text-slate-400" aria-hidden="true" />
                  {mock.questions} questions
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Past Results */}
      <section>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Past Results
        </p>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 md:grid">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Mock Name</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Date</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Score</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Percentile</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Rank</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Status</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Report</span>
          </div>

          {/* Table rows */}
          {PAST_RESULTS.map((result, idx) => (
            <div
              key={result.id}
              className={`grid grid-cols-1 gap-2 px-5 py-4 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] md:items-center md:gap-4 ${idx < PAST_RESULTS.length - 1 ? 'border-b border-slate-100' : ''}`}
            >
              {/* Mock name */}
              <div>
                <p className="font-semibold text-sm text-navy">{result.name}</p>
                {/* Mobile: show meta inline */}
                <p className="mt-0.5 text-xs text-slate-400 md:hidden">
                  {result.date} Â· {result.score} Â· {result.percentile} Â· {result.rank}
                </p>
              </div>

              {/* Date */}
              <p className="hidden text-sm text-slate-600 md:block">{result.date}</p>

              {/* Score */}
              <div className="hidden md:block">
                <span className="text-sm font-semibold text-navy">{result.score}</span>
                <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
                  <div
                    className="h-1.5 rounded-full bg-navy"
                    style={{ width: result.score }}
                    role="presentation"
                  />
                </div>
              </div>

              {/* Percentile */}
              <p className="hidden text-sm text-slate-600 md:block">{result.percentile}</p>

              {/* Rank */}
              <p className="hidden text-sm font-medium text-slate-700 md:block">{result.rank}</p>

              {/* Status */}
              <div className="hidden md:block">
                <StatusPill status={result.status} />
              </div>

              {/* View report */}
              <div className="flex items-center md:justify-end">
                <Link
                  href={`/dashboard/mock-report/${result.id}`}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  aria-label={`View report for ${result.name}`}
                >
                  View Report
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}