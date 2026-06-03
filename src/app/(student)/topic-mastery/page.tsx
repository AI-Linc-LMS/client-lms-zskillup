import Link from 'next/link';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Calculator, BookOpen, Brain, Code2, Calendar } from 'lucide-react';
import { listTopics, type ApiTopic } from '@/lib/api/catalog';

/**
 * Topic Mastery — Sprint 3 wires this to the live topics taxonomy
 * (`GET /api/v1/topics`, public). Root-level topics become the four category
 * tiles; each tile's child topics become deep-linked practice options.
 *
 * "Your weak topics" and "Recent activity" remain demo data until Sprint 5
 * lands the per-topic accuracy view backed by the practice ledger.
 */

const CATEGORY_VISUALS: Record<
  string,
  { icon: typeof Calculator; gradient: string }
> = {
  'quantitative-aptitude': { icon: Calculator, gradient: 'from-navy to-[#2d54b8]' },
  'verbal-ability': { icon: BookOpen, gradient: 'from-violet-600 to-violet-800' },
  'logical-reasoning': { icon: Brain, gradient: 'from-orange to-amber-600' },
  'programming-dsa': { icon: Code2, gradient: 'from-blue-700 to-indigo-900' },
  'cs-fundamentals': { icon: Code2, gradient: 'from-emerald-600 to-emerald-800' },
};

const FALLBACK = { icon: BookOpen, gradient: 'from-slate-700 to-slate-900' };

interface RootTopic extends ApiTopic {
  children: ApiTopic[];
}

function buildRoots(topics: ApiTopic[]): RootTopic[] {
  const roots = topics.filter((t) => t.parentId === null);
  return roots.map((r) => ({
    ...r,
    children: topics.filter((t) => t.parentId === r.id),
  }));
}

const weakTopics = [
  { slug: 'reading-comprehension', name: 'Data Interpretation', accuracy: 42, questions: 180 },
  { slug: 'arrays-strings', name: 'Coding', accuracy: 43, questions: 95 },
  { slug: 'reading-comprehension', name: 'Verbal RC', accuracy: 51, questions: 140 },
];

const recentTopics = [
  { slug: 'number-series', name: 'Number Series', lastPracticed: '2 days ago', accuracy: 68 },
  { slug: 'syllogisms', name: 'Syllogisms', lastPracticed: '4 days ago', accuracy: 74 },
  { slug: 'time-and-work', name: 'Time & Work', lastPracticed: '1 week ago', accuracy: 61 },
];

export default async function TopicMasteryPage() {
  let topics: ApiTopic[] = [];
  try {
    topics = await listTopics();
  } catch {
    // Backend unreachable in preview — render empty root list with sensible CTAs.
  }
  const roots = buildRoots(topics);

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Topic Mastery' },
        ]}
      />

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Topic mastery
        </p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">
          Drill any topic, any time
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Pattern-matched questions for {topics.length || 'every'} topic. Server-graded, with
          step-by-step explanations and instant hints.
        </p>
      </div>

      {/* Category tiles */}
      {roots.length > 0 ? (
        <div>
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Browse by Category
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {roots.map((root) => {
              const visuals = CATEGORY_VISUALS[root.slug] ?? FALLBACK;
              const Icon = visuals.icon;
              return (
                <Link
                  key={root.id}
                  href={`/practice?topic=${encodeURIComponent(root.slug)}`}
                  className={`group flex flex-col gap-4 rounded-xl bg-gradient-to-br ${visuals.gradient} p-5 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                      <Icon className="size-5 text-white" aria-hidden="true" />
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-white">{root.name}</p>
                    <p className="mt-1 text-xs text-white/70">
                      {root.children.length} subtopic{root.children.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Topic catalog is not available right now. Try refreshing — the backend may be warming up.
        </div>
      )}

      {/* Subtopic chips per root */}
      {roots.map((root) => (
        root.children.length > 0 ? (
          <div key={root.id}>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {root.name} — drill a subtopic
            </p>
            <div className="flex flex-wrap gap-2">
              {root.children.map((child) => (
                <Link
                  key={child.id}
                  href={`/practice?topic=${encodeURIComponent(child.slug)}`}
                  className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-navy transition-colors hover:border-orange hover:bg-orange/5"
                >
                  {child.name}
                </Link>
              ))}
            </div>
          </div>
        ) : null
      ))}

      {/* Weak topics */}
      <div>
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Your Weak Topics
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {weakTopics.map((topic) => (
            <div
              key={`${topic.slug}-${topic.name}`}
              className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <p className="font-semibold text-navy">{topic.name}</p>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  Weak
                </span>
              </div>
              <div className="mb-1 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{ width: `${topic.accuracy}%` }}
                    role="progressbar"
                    aria-valuenow={topic.accuracy}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${topic.name} accuracy`}
                  />
                </div>
                <span className="text-xs font-semibold text-amber-700">{topic.accuracy}%</span>
              </div>
              <p className="mb-4 text-xs text-slate-400">{topic.questions} questions available</p>
              <Link
                href={`/practice?topic=${encodeURIComponent(topic.slug)}`}
                className="inline-block rounded-full bg-orange px-5 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
              >
                Drill now
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Continue where you left off */}
      <div>
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Continue Where You Left Off
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recentTopics.map((topic) => (
            <div
              key={topic.slug}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <p className="font-semibold text-navy">{topic.name}</p>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Calendar className="size-3" aria-hidden="true" />
                  <span>{topic.lastPracticed}</span>
                </div>
              </div>
              <div className="mb-1 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-navy"
                    style={{ width: `${topic.accuracy}%` }}
                    role="progressbar"
                    aria-valuenow={topic.accuracy}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${topic.name} accuracy`}
                  />
                </div>
                <span className="text-xs font-semibold text-navy">{topic.accuracy}%</span>
              </div>
              <p className="mb-4 text-xs text-slate-400">Accuracy</p>
              <Link
                href={`/practice?topic=${encodeURIComponent(topic.slug)}`}
                className="inline-block rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Continue
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
