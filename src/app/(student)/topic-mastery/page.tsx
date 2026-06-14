import Link from 'next/link';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Calculator, BookOpen, Brain, Code2 } from 'lucide-react';
import { listTopics, type ApiTopic } from '@/lib/api/catalog';
import { TopicAccuracyPanels } from '@/components/practice/TopicAccuracyPanels';

/**
 * Topic Mastery — fully live. The category tiles + subtopic chips come from
 * the topics taxonomy (`GET /api/v1/topics`, public); the weak-topic and
 * recently-practised panels come from the student's real per-topic accuracy
 * (`GET /practice/accuracy/topics`, client leaf).
 */

const CATEGORY_VISUALS: Record<
  string,
  { icon: typeof Calculator; gradient: string }
> = {
  'quantitative-aptitude': { icon: Calculator, gradient: 'from-navy to-blue-700' },
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
          Pattern-matched questions across {topics.length > 0 ? `${topics.length} topics` : 'every topic'}.
          Server-graded, with step-by-step explanations and instant hints.
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
                  className={`group flex flex-col gap-4 rounded-xl bg-gradient-to-br ${visuals.gradient} p-5 shadow-sm transition-shadow hover:shadow-md`}
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

      {/* Live per-topic accuracy (weak + recently practised) */}
      <TopicAccuracyPanels />
    </div>
  );
}
