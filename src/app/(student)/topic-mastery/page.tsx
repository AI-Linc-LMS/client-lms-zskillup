import Link from 'next/link';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import {
  ArrowRight,
  BookOpen,
  Brain,
  Calculator,
  Code2,
  Cpu,
  GraduationCap,
  Layers,
  Sparkles,
} from 'lucide-react';
import { listTopics, type ApiTopic } from '@/lib/api/catalog';
import { TopicAccuracyPanels } from '@/components/practice/TopicAccuracyPanels';
import { Reveal, Stagger, StaggerItem } from '@/components/motion/primitives';

/**
 * Topic Mastery — fully live. The category tiles + subtopic chips come from
 * the topics taxonomy (`GET /api/v1/topics`, public); the weak-topic and
 * recently-practised panels come from the student's real per-topic accuracy
 * (`GET /practice/accuracy/topics`, client leaf).
 */

type Accent = 'sky' | 'violet' | 'orange' | 'emerald' | 'indigo' | 'amber';
const ACCENT_CYCLE: Accent[] = ['sky', 'violet', 'orange', 'emerald', 'indigo', 'amber'];

const ACCENT_CLASS: Record<Accent, { tile: string; chip: string; bar: string }> = {
  sky: { tile: 'bg-sky-50 text-sky-600 ring-sky-100', chip: 'hover:border-sky-300 hover:bg-sky-50/70', bar: 'from-sky-400 to-sky-600' },
  violet: { tile: 'bg-violet-50 text-violet-600 ring-violet-100', chip: 'hover:border-violet-300 hover:bg-violet-50/70', bar: 'from-violet-400 to-violet-600' },
  orange: { tile: 'bg-orange-50 text-orange-600 ring-orange-100', chip: 'hover:border-orange-300 hover:bg-orange-50/70', bar: 'from-orange-400 to-orange-600' },
  emerald: { tile: 'bg-emerald-50 text-emerald-600 ring-emerald-100', chip: 'hover:border-emerald-300 hover:bg-emerald-50/70', bar: 'from-emerald-400 to-emerald-600' },
  indigo: { tile: 'bg-indigo-50 text-indigo-600 ring-indigo-100', chip: 'hover:border-indigo-300 hover:bg-indigo-50/70', bar: 'from-indigo-400 to-indigo-600' },
  amber: { tile: 'bg-amber-50 text-amber-600 ring-amber-100', chip: 'hover:border-amber-300 hover:bg-amber-50/70', bar: 'from-amber-400 to-amber-600' },
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

function buildRoots(topics: ApiTopic[]): RootTopic[] {
  const roots = topics.filter((t) => t.parentId === null);
  return roots.map((r, i) => ({
    ...r,
    children: topics.filter((t) => t.parentId === r.id),
    icon: CATEGORY_ICON[r.slug] ?? Layers,
    accent: CATEGORY_ACCENT[r.slug] ?? ACCENT_CYCLE[i % ACCENT_CYCLE.length],
  }));
}

export default async function TopicMasteryPage() {
  let topics: ApiTopic[] = [];
  try {
    topics = await listTopics();
  } catch {
    // Backend unreachable in preview — render empty root list with sensible CTAs.
  }
  const roots = buildRoots(topics);
  const subtopicCount = roots.reduce((s, r) => s + r.children.length, 0);

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Topic Mastery' },
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
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">Topic mastery</p>
                <h1 className="text-2xl font-black tracking-tight sm:text-[28px]">Drill any topic, any time</h1>
              </div>
            </div>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/60">
              Pattern-matched questions across {topics.length > 0 ? `${topics.length} topics` : 'every topic'},
              server-graded with step-by-step explanations and instant hints.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <HeroStat icon={Layers} value={String(roots.length)} label="Categories" />
              <HeroStat icon={Sparkles} value={String(subtopicCount)} label="Subtopics" />
            </div>
          </div>
        </section>
      </Reveal>

      {/* ── Category cards ────────────────────────────────────────────────── */}
      {roots.length > 0 ? (
        <div>
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Browse by category</p>
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {roots.map((root) => {
              const Icon = root.icon;
              const a = ACCENT_CLASS[root.accent];
              return (
                <StaggerItem key={root.id} className="h-full">
                  <Link
                    href={`/practice?topic=${encodeURIComponent(root.slug)}`}
                    className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`grid size-11 place-items-center rounded-xl ring-1 ${a.tile}`}>
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <ArrowRight className="size-4 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-navy" />
                    </div>
                    <p className="mt-4 font-bold leading-snug text-navy">{root.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {root.children.length} subtopic{root.children.length === 1 ? '' : 's'}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-orange opacity-0 transition-opacity group-hover:opacity-100">
                      Start practice →
                    </span>
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Topic catalog is not available right now. Try refreshing — the backend may be warming up.
        </div>
      )}

      {/* ── Subtopic groups (one structured card per category) ────────────── */}
      {roots.map((root) =>
        root.children.length > 0 ? (
          <Reveal key={root.id}>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <span className={`grid size-9 place-items-center rounded-lg ring-1 ${ACCENT_CLASS[root.accent].tile}`}>
                  <root.icon className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold text-navy">{root.name}</p>
                  <p className="text-[11px] text-slate-400">Pick a subtopic to drill</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {root.children.map((child) => (
                  <Link
                    key={child.id}
                    href={`/practice?topic=${encodeURIComponent(child.slug)}`}
                    className={`rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-navy transition-colors ${ACCENT_CLASS[root.accent].chip}`}
                  >
                    {child.name}
                  </Link>
                ))}
              </div>
            </div>
          </Reveal>
        ) : null,
      )}

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
