import Link from 'next/link';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { BookOpen, Compass, GraduationCap, Layers, Sparkles, Target } from 'lucide-react';
import {
  listCompanies,
  listTopics,
  listTopicsWithCounts,
  type ApiCompany,
  type ApiTopic,
} from '@/lib/api/catalog';
import { TopicAccuracyPanels } from '@/components/practice/TopicAccuracyPanels';
import { PracticePicker } from '@/components/practice/PracticePicker';
import { UpgradeBanner } from '@/components/billing/UpgradeBanner';
import { Reveal } from '@/components/motion/primitives';

/**
 * Practice (Mode 1) — adaptive, non-proctored picker. Server fetches the topic
 * taxonomy + companies; the interactive, categorised, searchable picker is the
 * client component. Replaces the old linear /practice feed + Topic Mastery.
 */
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ company?: string }>;
}

export default async function PracticePage({ searchParams }: PageProps) {
  const { company } = await searchParams;
  const companyParam = company ? `&company=${encodeURIComponent(company)}` : '';

  let topics: ApiTopic[] = [];
  try {
    topics = await listTopicsWithCounts();
  } catch {
    try {
      topics = await listTopics();
    } catch {
      /* backend warming up */
    }
  }
  let companies: ApiCompany[] = [];
  try {
    companies = await listCompanies();
  } catch {
    /* optional */
  }

  // Match the picker: real section roots only (drop the leftover AI-experiment root
  // and flat roots with no populated topics). Coding is the synthetic 5th section.
  const sectionRoots = topics.filter(
    (t) =>
      t.parentId === null &&
      t.slug !== 'ai-practice-topics' &&
      topics.some((c) => c.parentId === t.id && (c.questionCount ?? 0) > 0),
  );
  const sectionCount = sectionRoots.length + 1; // + Coding
  const subtopicCount = topics.filter(
    (t) => t.parentId !== null && (t.questionCount ?? 0) > 0 && sectionRoots.some((r) => r.id === t.parentId),
  ).length;
  const questionTotal = sectionRoots.reduce((s, r) => s + (r.questionCount ?? 0), 0);
  const activeCompany = company ? companies.find((c) => c.slug === company) ?? null : null;
  const pickerCompanies = companies.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    questionCount: c.questionCount,
  }));

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Practice' },
        ]}
      />

      <Reveal>
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1f2d4d] via-[#16223f] to-[#0b1220] p-6 text-white shadow-sm sm:p-8">
          <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[#6d3bf5]/25 blur-3xl" />
          <span aria-hidden className="pointer-events-none absolute -bottom-20 left-1/4 size-56 rounded-full bg-[#f37021]/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl border border-white/10 bg-white/5 text-[#c9b6ff]">
                <GraduationCap className="size-5" />
              </span>
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-white/70 ring-1 ring-inset ring-white/15">
                  <Compass className="size-3.5" /> Practice
                </span>
                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                  {activeCompany ? `Practice for ${activeCompany.name}` : 'Adaptive practice, your way'}
                </h1>
              </div>
            </div>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/60">
              Adaptive &amp; non-proctored — pick a company, a section, or a single topic. Questions you&apos;ve
              already seen won&apos;t repeat until you&apos;ve been through the bank, and you can leave and resume any time.
            </p>
            {activeCompany ? (
              <div className="mt-6">
                <Link
                  href={`/dashboard/quiz/adaptive?company=${encodeURIComponent(activeCompany.slug)}`}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-[#16223f] transition-transform hover:-translate-y-0.5"
                >
                  <Target className="size-4" /> Start {activeCompany.name}-wide practice
                </Link>
              </div>
            ) : (
              <div className="mt-6 flex flex-wrap gap-3">
                <HeroStat icon={Layers} value={String(sectionCount)} label="Sections" />
                <HeroStat icon={Sparkles} value={String(subtopicCount)} label="Topics" />
                {questionTotal > 0 ? (
                  <HeroStat icon={BookOpen} value={questionTotal.toLocaleString()} label="Questions" />
                ) : null}
              </div>
            )}
          </div>
        </section>
      </Reveal>

      <UpgradeBanner />

      <PracticePicker topics={topics} companies={pickerCompanies} companyParam={companyParam} />

      <TopicAccuracyPanels />
    </div>
  );
}

function HeroStat({ icon: Icon, value, label }: { icon: typeof Layers; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <Icon className="size-4 text-white/40" />
      <div>
        <p className="text-lg font-extrabold leading-none text-white tabular-nums">{value}</p>
        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/40">{label}</p>
      </div>
    </div>
  );
}
