import Link from 'next/link';
import { ArrowLeft, ArrowRight, BarChart3, Sparkles, Target, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MockReportLoader, MockRunner } from '@/components/practice/MockRunner';
import { ProctoredAssessmentHost } from '@/components/proctoring/ProctoredAssessmentHost';

/**
 * Full-screen assessment route (Zone B, no AppShell).
 *
 * `?mock=<id>`            — runs the real server-timed mock engine.
 * `?mock=<id>&proctored=1`— proctored ASSESSMENT: device-check → proctored run.
 * `?report=<id>`          — re-opens the persisted report for a finalized attempt.
 * Neither                 — a landing that sends the student to the catalog.
 */
export default async function FullMockQuizPage({
  searchParams,
}: {
  searchParams: Promise<{ mock?: string; report?: string; proctored?: string }>;
}) {
  const { mock, report, proctored } = await searchParams;
  if (report) return <MockReportLoader attemptId={report} />;
  if (mock && proctored === '1') return <ProctoredAssessmentHost mockId={mock} />;
  if (mock) return <MockRunner mockId={mock} />;
  return <QuizLanding />;
}

function QuizLanding() {
  const points = [
    { icon: Timer, text: 'A single server-enforced timer for the whole test — it auto-submits at zero.' },
    { icon: Target, text: 'Move between questions freely and change answers until you submit.' },
    { icon: BarChart3, text: 'A percentile, topic-by-topic breakdown, and full answer review at the end.' },
  ];
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-navy">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_-10%,rgba(243,112,33,0.08),transparent),radial-gradient(50%_50%_at_100%_100%,rgba(56,189,248,0.07),transparent)]"
      />
      <div className="relative z-10 flex items-center justify-between px-8 py-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Exit to dashboard
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500 shadow-sm">
          <Sparkles className="size-3 text-orange" aria-hidden="true" /> Assessment mode
        </span>
      </div>

      <main className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-8 pb-16 pt-12 text-center">
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
          Timed mock tests
        </h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-600">
          Pick a mock from the catalog to start a real, server-graded timed assessment. Your score,
          percentile, and a full answer review are ready the moment you submit.
        </p>

        <ul className="mt-8 w-full max-w-lg space-y-3 text-left">
          {points.map(({ icon: Icon, text }) => (
            <li
              key={text}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-[13px] leading-snug text-slate-600 shadow-sm"
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-orange" aria-hidden="true" />
              <span>{text}</span>
            </li>
          ))}
        </ul>

        <Button size="lg" className="mt-9" asChild>
          <Link href="/mock-tests">
            Browse mock tests <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </main>
    </div>
  );
}
