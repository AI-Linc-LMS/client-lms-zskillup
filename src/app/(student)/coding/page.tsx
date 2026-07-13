import Link from 'next/link';
import { ArrowLeft, Code2, Compass } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { CodingProblemsList } from '@/components/coding/CodingProblemsList';
import { Reveal } from '@/components/motion/primitives';

/**
 * Coding practice catalogue (Practice → Coding section). Lists the active coding
 * bank grouped by topic; `?topic=` narrows to a single coding topic so the
 * Practice picker's topic chips deep-link straight into a focused set.
 */
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ topic?: string }>;
}

export default async function CodingPracticePage({ searchParams }: PageProps) {
  const { topic } = await searchParams;

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Adaptive', href: '/practice' },
          { label: topic ? `Coding · ${topic}` : 'Coding' },
        ]}
      />

      <Reveal>
        <section data-tour="coding:hero" className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0f1117] via-[#171b2e] to-[#202b63] p-6 text-white sm:p-8">
          <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[#6d3bf5]/25 blur-3xl" />
          <span aria-hidden className="pointer-events-none absolute -bottom-20 left-1/4 size-56 rounded-full bg-[#4f7bf5]/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl border border-white/10 bg-white/5 text-[#c9b6ff]">
                <Code2 className="size-5" />
              </span>
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-white/70 ring-1 ring-inset ring-white/15">
                  <Compass className="size-3.5" /> Coding practice
                </span>
                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                  {topic ? topic : 'Practice coding by topic'}
                </h1>
              </div>
            </div>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/60">
              {topic
                ? `Every ${topic} problem in the bank — Judge0-evaluated, XP on your first solve.`
                : 'Solve DSA problems grouped by topic. Each solve is graded on the self-hosted Judge0 and earns XP the first time.'}
            </p>
            {topic ? (
              <div className="mt-6">
                <Link
                  href="/coding"
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white ring-1 ring-inset ring-white/20 transition-colors hover:bg-white/15"
                >
                  <ArrowLeft className="size-4" /> All coding topics
                </Link>
              </div>
            ) : null}
          </div>
        </section>
      </Reveal>

      <CodingProblemsList topic={topic} />
    </div>
  );
}
