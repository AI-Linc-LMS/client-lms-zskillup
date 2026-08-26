import { Suspense } from 'react';
import type { Metadata } from 'next';
import { BadgeCheck, LineChart, MousePointerClick, Sparkles } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { AuroraBackground, Reveal } from '@/components/motion/primitives';
import { JobsTabsShell } from '@/components/jobs/JobsTabsShell';

/**
 * The job board, inside the workspace chrome.
 *
 * It lives in the (student) group so it gets the top bar and sidebar every other page
 * in the product has - the board is somewhere students come back to weekly, and a page
 * with no navigation reads as a different site.
 *
 * The page opens on the same aurora hero the dashboard, Company Hubs and Sectional Hubs
 * pages use, so Jobs reads as a first-class destination in the product rather than a
 * bolt-on with its own visual language. The dark hero sits above the light workspace
 * (search, filters, tabs, results) - the established "dark hero, light body" rhythm.
 *
 * Deliberately NOT in middleware's PROTECTED_PREFIXES: the sitemap lists this URL, and
 * bouncing a crawler to /login is worse than serving it the untargeted jobs. A
 * logged-out visitor gets the same shell in its signed-out state.
 */
export const metadata: Metadata = {
  title: 'Jobs & Internships',
  description:
    'Live openings for students and freshers - roles, locations, eligibility and how to apply.',
};

const HERO_TILES = [
  {
    icon: MousePointerClick,
    title: 'One-click apply',
    body: 'We send the profile and resume you already built here.',
  },
  {
    icon: LineChart,
    title: 'Track every stage',
    body: 'Submitted, shortlisted, offer - the whole pipeline in one view.',
  },
  {
    icon: BadgeCheck,
    title: 'Verified partners',
    body: 'Every opening comes from a company we actively work with.',
  },
];

export default function JobsPage() {
  return (
    <div className="w-full space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Jobs' }]} />

      <Reveal>
        <section className="relative isolate overflow-hidden rounded-[1.75rem] p-7 text-white sm:rounded-[2rem] sm:p-10">
          <AuroraBackground />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[1.75rem] ring-1 ring-inset ring-white/10 sm:rounded-[2rem]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
          />
          <div className="relative z-10 max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur">
              <Sparkles className="size-3.5 text-[#ffc42d]" />
              Placement board · Verified partners
            </span>
            <h1 className="mt-6 bg-gradient-to-b from-white to-white/70 bg-clip-text text-3xl font-extrabold leading-[1.08] tracking-tight text-transparent sm:text-[42px]">
              Roles worth <span className="text-[#ffc42d]">applying to</span>.
            </h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/65 sm:text-base">
              Openings from the companies our hiring partners recruit for. Filter by what matters,
              apply in one click, and track every application from the same place.
            </p>

            <ul className="mt-8 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
              {HERO_TILES.map(({ icon: Icon, title, body }) => (
                <li
                  key={title}
                  className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur"
                >
                  <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#ffd24d] via-[#ffc42d] to-[#f5b400] text-[#171717] shadow-[0_8px_20px_-8px_rgba(245,180,0,0.5)]">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <p className="mt-3 text-sm font-bold text-white">{title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/55">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </Reveal>

      {/* useSearchParams needs a boundary; without it the whole route opts out of
          static rendering for one optional ?tab= param. */}
      <Suspense fallback={null}>
        <JobsTabsShell />
      </Suspense>
    </div>
  );
}
