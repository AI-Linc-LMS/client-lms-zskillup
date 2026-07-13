import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { CompaniesExplorer } from '@/components/company/CompaniesExplorer';
import { Disclaimer } from '@/components/legal/Disclaimer';
import { listCompanies, listTopics } from '@/lib/api/catalog';
import { AnimatedNumber, AuroraBackground, Reveal } from '@/components/motion/primitives';
import { Building2, ListChecks, Sparkles } from 'lucide-react';

export default async function CompaniesPage() {
  // Real catalog counts for the hero stat bar (public reads). If the backend is
  // unreachable we simply omit the bar rather than show fabricated numbers.
  let stats: { companies: number; topics: number } | null = null;
  try {
    const [companies, topics] = await Promise.all([listCompanies(), listTopics()]);
    stats = { companies: companies.length, topics: topics.length };
  } catch {
    stats = null;
  }

  const statTiles = stats
    ? [
        { label: 'Recruiting companies', value: stats.companies, icon: Building2 },
        { label: 'Practice topics', value: stats.topics, icon: ListChecks },
      ]
    : [];

  return (
    <div className="w-full">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Companies' }]} />

      {/* Hero - deep navy aurora canvas with glass stat cards */}
      <Reveal>
        <section data-tour="company:hero" className="relative isolate mb-8 overflow-hidden rounded-[1.75rem] p-7 text-white sm:rounded-[2rem] sm:p-10">
          <AuroraBackground />

          {/* layered depth - inner ring + top-edge highlight */}
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
              Catalog · Campus recruitment · Company hubs
            </span>

            <h1 className="mt-6 bg-gradient-to-b from-white to-white/70 bg-clip-text text-3xl font-extrabold leading-[1.08] tracking-tight text-transparent sm:text-[42px]">
              Choose your <span className="text-[#ffc42d]">target company</span>.
            </h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/65 sm:text-base">
              Pick a recruiter and follow a guided track - process overview, topic-wise practice
              from the real question bank, and timed mocks pattern-matched to the actual drive.
            </p>

            {stats ? (
              <dl className="mt-8 grid max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
                {statTiles.map(({ label, value, icon: Icon }) => (
                  <div
                    key={label}
                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur transition-colors hover:border-white/20 hover:bg-white/[0.1]"
                  >
                    <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#ffd24d] via-[#ffc42d] to-[#f5b400] text-[#171717] shadow-[0_8px_20px_-8px_rgba(245,180,0,0.5)]">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <dd className="mt-3 text-2xl font-extrabold leading-none tabular-nums">
                      <AnimatedNumber value={value} />
                    </dd>
                    <dt className="mt-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/50">
                      {label}
                    </dt>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </section>
      </Reveal>

      <CompaniesExplorer />

      {/* Once, under the grid - not repeated inside each card. */}
      <Disclaimer className="mt-2" />
    </div>
  );
}
