import Link from 'next/link';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import {
  ArrowRight,
  BookOpen,
  Brain,
  Building2,
  Calculator,
  Code2,
  Compass,
  Cpu,
  GraduationCap,
  Layers,
  ListTree,
  Sparkles,
  Target,
} from 'lucide-react';
import {
  listCompanies,
  listTopics,
  listTopicsWithCounts,
  type ApiCompany,
  type ApiTopic,
} from '@/lib/api/catalog';
import { TopicAccuracyPanels } from '@/components/practice/TopicAccuracyPanels';
import { Reveal, Stagger, StaggerItem } from '@/components/motion/primitives';

/**
 * Practice (Mode 1) — the adaptive, non-proctored picker. A student chooses a
 * COMPANY, a SECTION (root topic, e.g. Quantitative Aptitude), or a TOPIC/subtopic,
 * and launches the adaptive runner (live points + resume). This page replaces the
 * old linear /practice feed and folds in the former Topic Mastery browser.
 */

type Accent = 'sky' | 'violet' | 'orange' | 'emerald' | 'indigo' | 'amber';
const ACCENT_CYCLE: Accent[] = ['sky', 'violet', 'orange', 'emerald', 'indigo', 'amber'];

const ACCENT_CLASS: Record<Accent, { tile: string; chip: string }> = {
  sky: { tile: 'bg-sky-50 text-sky-600 ring-sky-100', chip: 'hover:border-sky-300 hover:bg-sky-50/70' },
  violet: { tile: 'bg-violet-50 text-violet-600 ring-violet-100', chip: 'hover:border-violet-300 hover:bg-violet-50/70' },
  orange: { tile: 'bg-orange-50 text-orange-600 ring-orange-100', chip: 'hover:border-orange-300 hover:bg-orange-50/70' },
  emerald: { tile: 'bg-emerald-50 text-emerald-600 ring-emerald-100', chip: 'hover:border-emerald-300 hover:bg-emerald-50/70' },
  indigo: { tile: 'bg-indigo-50 text-indigo-600 ring-indigo-100', chip: 'hover:border-indigo-300 hover:bg-indigo-50/70' },
  amber: { tile: 'bg-amber-50 text-amber-600 ring-amber-100', chip: 'hover:border-amber-300 hover:bg-amber-50/70' },
};

const CATEGORY_ICON: Record<string, typeof Calculator> = {
  'quantitative-aptitude': Calculator,
  'verbal-ability': BookOpen,
  'logical-reasoning': Brain,
  'programming-dsa': Code2,
  'cs-fundamentals': Cpu,
};
const CATEGORY_ACCENT: Record<string, Accent> = {
  'quantitative-aptitude': 'sky',
  'verbal-ability': 'violet',
  'logical-reasoning': 'orange',
  'programming-dsa': 'indigo',
  'cs-fundamentals': 'emerald',
};

interface RootTopic extends ApiTopic {
  children: ApiTopic[];
  icon: typeof Calculator;
  accent: Accent;
}

export const dynamic = 'force-dynamic';

function buildRoots(topics: ApiTopic[], filterEmpty: boolean): RootTopic[] {
  const ok = (t: ApiTopic) => !filterEmpty || (t.questionCount ?? 0) > 0;
  const roots = topics.filter((t) => t.parentId === null && ok(t));
  return roots
    .map((r, i) => ({
      ...r,
      children: topics.filter((t) => t.parentId === r.id && ok(t)),
      icon: CATEGORY_ICON[r.slug] ?? Layers,
      accent: CATEGORY_ACCENT[r.slug] ?? ACCENT_CYCLE[i % ACCENT_CYCLE.length],
    }))
    .filter((r) => r.children.length > 0);
}

interface PageProps {
  searchParams: Promise<{ company?: string }>;
}

export default async function PracticePage({ searchParams }: PageProps) {
  const { company } = await searchParams;
  const companyParam = company ? `&company=${encodeURIComponent(company)}` : '';
  const adaptiveTopicHref = (slug: string) =>
    `/dashboard/quiz/adaptive?topic=${encodeURIComponent(slug)}${companyParam}`;

  let topics: ApiTopic[] = [];
  let filterEmpty = false;
  try {
    topics = await listTopicsWithCounts();
    filterEmpty = true;
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

  const roots = buildRoots(topics, filterEmpty);
  const subtopicCount = roots.reduce((s, r) => s + r.children.length, 0);
  const questionTotal = roots.reduce((s, r) => s + (r.questionCount ?? 0), 0);
  const activeCompany = company ? companies.find((c) => c.slug === company) ?? null : null;

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Practice' },
        ]}
      />

      {/* ── Navy premium hero ─────────────────────────────────────────────── */}
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
              Adaptive &amp; non-proctored — pick a company, a section, or a single topic. Difficulty
              tunes to you, points tick down the longer you take, and you can leave and resume any time.
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
                <HeroStat icon={Layers} value={String(roots.length)} label="Sections" />
                <HeroStat icon={Sparkles} value={String(subtopicCount)} label="Topics" />
                {questionTotal > 0 ? (
                  <HeroStat icon={BookOpen} value={questionTotal.toLocaleString()} label="Questions" />
                ) : null}
              </div>
            )}
          </div>
        </section>
      </Reveal>

      {/* ── Practice by company ───────────────────────────────────────────── */}
      {companies.length > 0 ? (
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-violet-600 ring-1 ring-inset ring-violet-100">
            <Building2 className="size-3.5" /> By company
          </span>
          <h2 className="mb-4 mt-2 text-lg font-extrabold tracking-tight text-navy sm:text-xl">
            Practice a company&apos;s question style
          </h2>
          <div className="flex flex-wrap gap-2">
            {companies.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/quiz/adaptive?company=${encodeURIComponent(c.slug)}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-navy transition-colors hover:border-violet-300 hover:bg-violet-50/70"
              >
                <Building2 className="size-3.5 text-violet-500" />
                {c.name}
                {c.questionCount ? (
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                    {c.questionCount}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── Section cards ─────────────────────────────────────────────────── */}
      {roots.length > 0 ? (
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 ring-1 ring-inset ring-emerald-100">
            <Compass className="size-3.5" /> By section
          </span>
          <h2 className="mb-5 mt-2 text-lg font-extrabold tracking-tight text-navy sm:text-xl">
            Practice a whole section
          </h2>
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {roots.map((root) => {
              const Icon = root.icon;
              const a = ACCENT_CLASS[root.accent];
              return (
                <StaggerItem key={root.id} className="h-full">
                  <Link
                    href={adaptiveTopicHref(root.slug)}
                    className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_-30px_rgba(16,185,129,0.25)] transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
                  >
                    <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full bg-emerald-400/10 blur-2xl transition-opacity duration-500 group-hover:opacity-60" />
                    <div className="relative flex items-center justify-between">
                      <span className={`grid size-12 place-items-center rounded-2xl ring-1 ${a.tile}`}>
                        <Icon className="size-6" aria-hidden="true" />
                      </span>
                      <ArrowRight className="size-4 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-emerald-600" />
                    </div>
                    <p className="relative mt-4 text-base font-bold leading-snug text-navy">{root.name}</p>
                    <p className="relative mt-1 text-xs text-slate-500">
                      {root.children.length} topic{root.children.length === 1 ? '' : 's'}
                      {root.questionCount ? ` · ${root.questionCount.toLocaleString()} questions` : ''}
                    </p>
                    <span className="relative mt-4 inline-flex items-center gap-1 text-xs font-bold text-emerald-600 opacity-0 transition-opacity group-hover:opacity-100">
                      Start section practice →
                    </span>
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 text-sm text-slate-500 shadow-[0_18px_50px_-30px_rgba(16,185,129,0.25)]">
          Topic catalog is not available right now. Try refreshing — the backend may be warming up.
        </div>
      )}

      {/* ── Subtopic groups ───────────────────────────────────────────────── */}
      {roots.length > 0 ? (
        <div className="space-y-5">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 ring-1 ring-inset ring-emerald-100">
              <ListTree className="size-3.5" /> By topic
            </span>
            <h2 className="mt-2 text-lg font-extrabold tracking-tight text-navy sm:text-xl">Pick a single topic</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {roots.map((root) =>
              root.children.length > 0 ? (
                <Reveal key={root.id} className="h-full">
                  <div className="relative h-full overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_-30px_rgba(16,185,129,0.25)]">
                    <span aria-hidden className="pointer-events-none absolute -right-12 -top-14 size-40 rounded-full bg-emerald-400/10 blur-2xl" />
                    <div className="relative mb-4 flex items-center gap-3">
                      <span className={`grid size-11 place-items-center rounded-2xl ring-1 ${ACCENT_CLASS[root.accent].tile}`}>
                        <root.icon className="size-5" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-base font-bold text-navy">{root.name}</p>
                        <p className="text-[11px] text-slate-400">Pick a topic to practice</p>
                      </div>
                    </div>
                    <div className="relative flex flex-wrap gap-2">
                      {root.children.map((child) => (
                        <Link
                          key={child.id}
                          href={adaptiveTopicHref(child.slug)}
                          className={`inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-navy transition-colors ${ACCENT_CLASS[root.accent].chip}`}
                        >
                          {child.name}
                          {child.questionCount ? (
                            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                              {child.questionCount}
                            </span>
                          ) : null}
                        </Link>
                      ))}
                    </div>
                  </div>
                </Reveal>
              ) : null,
            )}
          </div>
        </div>
      ) : null}

      {/* Live per-topic accuracy (weak + recently practised) */}
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
