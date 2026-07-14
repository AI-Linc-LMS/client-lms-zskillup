import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { SectionsExplorer } from '@/components/sections/SectionsExplorer';
import { Disclaimer } from '@/components/legal/Disclaimer';
import { listTopicsWithCounts } from '@/lib/api/catalog';
import { buildSections } from '@/lib/sections/section-catalog';
import { AnimatedNumber, AuroraBackground, Reveal } from '@/components/motion/primitives';
import { Layers, ListChecks, Sparkles } from 'lucide-react';

/**
 * Sectional Hubs landing — the section-organized sibling of the Company Hubs page.
 * Same aurora hero + glass stat cards, but the grid is the five prep sections
 * (Numerical / Logical / Verbal / Technical / …) rather than recruiters.
 */
export const dynamic = 'force-dynamic';

export default async function SectionsPage() {
  let stats: { sections: number; topics: number } | null = null;
  try {
    const sections = buildSections(await listTopicsWithCounts());
    stats = {
      sections: sections.length,
      topics: sections.reduce((sum, s) => sum + s.topicCount, 0),
    };
  } catch {
    stats = null;
  }

  const statTiles = stats
    ? [
        { label: 'Prep sections', value: stats.sections, icon: Layers },
        { label: 'Topics inside', value: stats.topics, icon: ListChecks },
      ]
    : [];

  return (
    <div className="w-full">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Sections' }]} />

      <Reveal>
        <section className="relative isolate mb-8 overflow-hidden rounded-[1.75rem] p-7 text-white sm:rounded-[2rem] sm:p-10">
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
              Structured prep · Section by section
            </span>
            <h1 className="mt-6 bg-gradient-to-b from-white to-white/70 bg-clip-text text-3xl font-extrabold leading-[1.08] tracking-tight text-transparent sm:text-[42px]">
              Build strength <span className="text-[#ffc42d]">section by section</span>.
            </h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/65 sm:text-base">
              Pick a section and follow a guided track — syllabus, study material and topic-wise
              practice from the real question bank. Unlock a single topic or the whole section.
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

      <SectionsExplorer />

      <Disclaimer className="mt-2" />
    </div>
  );
}
