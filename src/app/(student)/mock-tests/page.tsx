import { Sparkles, Timer } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { MockTestsCatalog } from '@/components/practice/MockTestsCatalog';
import { MockHistory } from '@/components/practice/MockHistory';
import { AdaptiveMockHistory } from '@/components/practice/AdaptiveMockHistory';
import { AuroraBackground, Reveal } from '@/components/motion/primitives';

const CRUMBS = [
  { label: 'Home', href: '/' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Mock Tests' },
];

/**
 * Mock tests workspace (Sprint 4) — fully live:
 *   - catalog from `GET /mocks`
 *   - KPIs + past results from `GET /mocks/attempts/mine`
 * Each past result deep-links to its persisted server-graded report.
 */
export default function MockTestsPage() {
  return (
    <div>
      <Breadcrumb items={CRUMBS} />

      {/* Aurora hero header — sets the tone with depth + drama */}
      <Reveal>
        <header className="relative isolate overflow-hidden rounded-[1.75rem] p-7 text-white shadow-[0_30px_90px_-32px_rgba(11,18,32,0.85)] sm:rounded-[2rem] sm:p-9">
          <AuroraBackground />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[1.75rem] ring-1 ring-inset ring-white/10 sm:rounded-[2rem]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
          />

          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur">
              <Sparkles className="size-3.5 text-[#ffb877]" />
              Assessment Center
            </span>
            <h1 className="mt-5 bg-gradient-to-b from-white to-white/70 bg-clip-text text-3xl font-extrabold leading-[1.08] tracking-tight text-transparent sm:text-[40px]">
              Mock Tests
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/65 sm:text-base">
              Timed assessments with server-graded scores, percentile ranking, and a full answer
              review. Simulate the real thing and track your readiness over time.
            </p>
          </div>

          {/* Floating accent chip echoing the dashboard hero */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-8 hidden sm:block"
          >
            <div className="relative size-40">
              <div className="absolute inset-0 rounded-full bg-[#f37021]/25 blur-2xl" />
              <div className="absolute inset-6 rounded-full bg-[#1e6ff5]/30 blur-xl" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex size-16 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.08] shadow-[0_8px_30px_-8px_rgba(0,0,0,0.5)] backdrop-blur">
                  <Timer className="size-7 text-[#ffb877]" />
                </div>
              </div>
            </div>
          </div>
        </header>
      </Reveal>

      <div className="mt-8 space-y-10">
        <Reveal>
          <MockHistory />
        </Reveal>

        <Reveal>
          <AdaptiveMockHistory />
        </Reveal>

        <Reveal>
          <section>
            <header className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                  Catalog
                </p>
                <h2 className="mt-1 text-xl font-extrabold tracking-tight text-navy sm:text-2xl">
                  Available Mock Tests
                </h2>
              </div>
            </header>
            <MockTestsCatalog />
          </section>
        </Reveal>
      </div>
    </div>
  );
}
