import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Calculator, BookOpen, Brain, Code2, Clock } from 'lucide-react';

const categories = [
  {
    id: 'quantitative-aptitude',
    label: 'Quantitative Aptitude',
    slug: 'quantitative-aptitude',
    icon: Calculator,
    gradient: 'from-navy to-[#2d54b8]',
    topics: 24,
    questions: '3.1k',
  },
  {
    id: 'verbal-ability',
    label: 'Verbal Ability',
    slug: 'verbal-ability',
    icon: BookOpen,
    gradient: 'from-violet-600 to-violet-800',
    topics: 18,
    questions: '2.4k',
  },
  {
    id: 'logical-reasoning',
    label: 'Logical Reasoning',
    slug: 'logical-reasoning',
    icon: Brain,
    gradient: 'from-orange to-orange-600',
    topics: 15,
    questions: '1.8k',
  },
  {
    id: 'cs-fundamentals',
    label: 'CS Fundamentals',
    slug: 'cs-fundamentals',
    icon: Code2,
    gradient: 'from-emerald-600 to-emerald-800',
    topics: 12,
    questions: '1.2k',
  },
];

const weakTopics = [
  { name: 'Data Interpretation', accuracy: 42, questions: 180 },
  { name: 'Coding', accuracy: 43, questions: 95 },
  { name: 'Verbal RC', accuracy: 51, questions: 140 },
];

const recentTopics = [
  { name: 'Number Series', lastPracticed: '2 days ago', accuracy: 68 },
  { name: 'Syllogisms', lastPracticed: '4 days ago', accuracy: 74 },
  { name: 'Time & Work', lastPracticed: '1 week ago', accuracy: 61 },
];

export default function TopicMasteryPage() {
  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Topic Mastery' },
        ]}
      />

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-navy">Topic Mastery</h1>
        <p className="mt-1 text-sm text-slate-600">Drill any topic, any time</p>
      </div>

      {/* Category cards */}
      <div>
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Browse by Category
        </p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <a
                key={cat.id}
                href={`/topic-mastery/${cat.slug}`}
                className={`group flex flex-col gap-4 rounded-xl bg-gradient-to-br ${cat.gradient} p-5 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                    <Icon className="size-5 text-white" aria-hidden="true" />
                  </div>
                </div>
                <div>
                  <p className="font-bold text-white">{cat.label}</p>
                  <p className="mt-1 text-xs text-white/70">
                    {cat.topics} topics &middot; {cat.questions} questions
                  </p>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {/* Weak topics */}
      <div>
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Your Weak Topics
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {weakTopics.map((topic) => (
            <div
              key={topic.name}
              className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <p className="font-semibold text-navy">{topic.name}</p>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
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
              <a
                href={`/topic-mastery/drill?topic=${encodeURIComponent(topic.name)}`}
                className="inline-block rounded-full bg-orange px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
              >
                Drill now
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Continue where you left off */}
      <div>
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Continue Where You Left Off
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recentTopics.map((topic) => (
            <div
              key={topic.name}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <p className="font-semibold text-navy">{topic.name}</p>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="size-3" aria-hidden="true" />
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
              <a
                href={`/topic-mastery/drill?topic=${encodeURIComponent(topic.name)}`}
                className="inline-block rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Continue
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}