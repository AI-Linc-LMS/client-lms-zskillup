import Link from 'next/link';
import { ArrowRight, CalendarDays, ShieldCheck, Sparkles, Target } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { MockTestsCatalog } from '@/components/practice/MockTestsCatalog';
import { MockHistory } from '@/components/practice/MockHistory';
import { AdaptiveMockHistory } from '@/components/practice/AdaptiveMockHistory';
import { Reveal } from '@/components/motion/primitives';

const CRUMBS = [
  { label: 'Home', href: '/' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Mock Quiz' },
];

/**
 * Mock Quiz workspace — AI-evaluated, non-proctored self-practice that tunes its
 * difficulty to your level. (Proctored company Assessments are scheduled and
 * live on the Calendar.)
 */
export default function MockQuizPage() {
  return (
    <div>
      <Breadcrumb items={CRUMBS} />

      {/* Hero — navy premium */}
      <Reveal>
        <header className="relative isolate overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1f2d4d] via-[#16223f] to-[#0b1220] p-7 text-white shadow-sm sm:p-9">
          <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[#f37021]/20 blur-3xl" />
          <span aria-hidden className="pointer-events-none absolute -bottom-20 left-1/4 size-56 rounded-full bg-[#2563eb]/20 blur-3xl" />
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/75">
              <Sparkles className="size-3.5 text-[#ffb877]" />
              AI-evaluated · adjusts to your level
            </span>
            <h1 className="mt-5 text-3xl font-extrabold leading-[1.08] tracking-tight sm:text-[40px]">
              Mock Quiz
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/65 sm:text-base">
              Self-practice that tunes to every answer — questions target your weak skills, and a
              coach breaks down your result with a personalised study path. Non-proctored.
            </p>
          </div>
        </header>
      </Reveal>

      <div className="mt-8 space-y-10">
        {/* Mock quizzes */}
        <Reveal>
          <section>
            <header className="mb-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Practice</p>
              <h2 className="mt-1 flex items-center gap-2 text-xl font-extrabold tracking-tight text-navy sm:text-2xl">
                <Target className="size-5 text-orange" /> Mock quizzes
              </h2>
            </header>
            <MockTestsCatalog filter="adaptive" />
          </section>
        </Reveal>

        <Reveal>
          <AdaptiveMockHistory />
        </Reveal>

        {/* Proctored assessments pointer */}
        <Reveal>
          <section>
            <header className="mb-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Proctored</p>
              <h2 className="mt-1 flex items-center gap-2 text-xl font-extrabold tracking-tight text-navy sm:text-2xl">
                <ShieldCheck className="size-5 text-orange" /> Company assessments
              </h2>
            </header>
            <Link
              href="/calendar"
              className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-[#1f2d4d] to-[#0b1220] text-white">
                  <CalendarDays className="size-5 text-[#ffb877]" />
                </span>
                <div>
                  <p className="text-sm font-bold text-navy">Proctored assessments are scheduled</p>
                  <p className="text-xs text-slate-500">
                    Register for a company, then take its assessment in your window — see your calendar.
                  </p>
                </div>
              </div>
              <span className="flex items-center gap-1 text-sm font-bold text-orange">
                Calendar <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>

            {/* Past proctored assessment results */}
            <div className="mt-6">
              <MockHistory />
            </div>
          </section>
        </Reveal>
      </div>
    </div>
  );
}
