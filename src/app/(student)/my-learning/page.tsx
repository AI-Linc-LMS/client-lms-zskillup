import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { DEMO_COURSES, DemoCourse, CourseStatus } from '@/lib/demo-data';
import { BookOpen, Clock, Award, BarChart2, Eye } from 'lucide-react';

const CATEGORY_ACCENTS: Record<string, string> = {
  Aptitude: 'from-blue-600 to-indigo-700',
  Programming: 'from-teal-600 to-emerald-700',
  'Mock Drive': 'from-orange-500 to-amber-600',
  Verbal: 'from-violet-600 to-purple-700',
  DSA: 'from-rose-500 to-red-600',
  default: 'from-sky-600 to-blue-700',
};

const STATUS_PILL: Record<CourseStatus, string> = {
  'In progress': 'bg-sky-50 text-sky-700 border border-sky-200',
  'Due soon': 'bg-amber-50 text-amber-700 border border-amber-200',
  Completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Overdue: 'bg-red-50 text-red-700 border border-red-200',
};

const ALL_COURSES: DemoCourse[] = [
  ...DEMO_COURSES,
  {
    title: 'Data Structures Foundations',
    category: 'DSA',
    instructor: 'Ravi Shankar',
    lessons: 64,
    hours: 18,
    progress: 100,
    score: 91,
    due: null,
    status: 'Completed',
    tab: 'Completed',
  },
  {
    title: 'Verbal Ability Complete',
    category: 'Verbal',
    instructor: 'Priya Menon',
    lessons: 48,
    hours: 12,
    progress: 0,
    score: null,
    due: null,
    status: 'In progress',
    tab: 'Watchlist',
  },
];

const TABS: { key: DemoCourse['tab']; label: string; count: number }[] = [
  { key: 'Active', label: 'Active', count: 3 },
  { key: 'Completed', label: 'Completed', count: 1 },
  { key: 'Due soon', label: 'Due soon', count: 3 },
  { key: 'Watchlist', label: 'Watchlist', count: 0 },
];

function CourseCard({ course }: { course: DemoCourse }) {
  const accent = CATEGORY_ACCENTS[course.category] ?? CATEGORY_ACCENTS.default;
  const pillClass = STATUS_PILL[course.status];

  return (
    <article className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
      {/* Color accent bar */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${accent}`} aria-hidden="true" />

      <div className="flex flex-col flex-1 p-5 gap-3">
        {/* Category pill + instructor */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            {course.category}
          </span>
          <span className="text-xs text-slate-400">{course.instructor}</span>
        </div>

        {/* Title */}
        <h3 className="font-bold text-navy text-sm leading-snug line-clamp-2">
          {course.title}
        </h3>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <BookOpen className="size-3" aria-hidden="true" />
            {course.lessons} lessons
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3" aria-hidden="true" />
            {course.hours}h
          </span>
          {course.score !== null && (
            <span className="flex items-center gap-1">
              <BarChart2 className="size-3" aria-hidden="true" />
              Score {course.score}%
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="h-1.5 w-full rounded-full bg-slate-100" role="progressbar" aria-valuenow={course.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${course.progress}% complete`}>
            <div
              className="h-1.5 rounded-full bg-navy transition-all"
              style={{ width: `${course.progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{course.progress}% complete</span>
            {course.due && <span>Due {course.due}</span>}
          </div>
        </div>

        {/* Footer: status pill + CTA */}
        <div className="mt-auto flex items-center justify-between pt-1">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${pillClass}`}>
            {course.status}
          </span>
          <button
            type="button"
            className="rounded-full bg-orange px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
          >
            {course.status === 'Completed' ? 'Review' : 'Continue'}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function MyLearningPage() {
  // Default to showing Active + Due soon combined for the static server render
  const visibleCourses = ALL_COURSES.filter(
    (c) => c.tab === 'Active' || c.tab === 'Due soon',
  );

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'My Learning' },
        ]}
      />

      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Student Workspace
          </p>
          <h1 className="mt-0.5 text-2xl font-bold text-navy">My Learning</h1>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <Award className="size-4 text-orange" aria-hidden="true" />
          <span className="text-sm font-semibold text-navy">8</span>
          <span className="text-sm text-slate-500">courses enrolled</span>
        </div>
      </div>

      {/* Summary KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'In Progress', value: '3', sub: 'Active courses' },
          { label: 'Completed', value: '1', sub: 'This semester' },
          { label: 'Due soon', value: '3', sub: 'Within 30 days' },
          { label: 'Avg Score', value: '75%', sub: 'Across assessments' },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{kpi.label}</p>
            <p className="mt-1 text-[26px] font-extrabold leading-none text-navy">{kpi.value}</p>
            <p className="mt-0.5 text-xs text-slate-400">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6 overflow-x-auto">
          {TABS.map((tab, idx) => (
            <button
              key={tab.key}
              type="button"
              className={`flex shrink-0 items-center gap-1.5 pb-3 text-sm transition-colors ${
                idx === 0
                  ? 'border-b-2 border-orange font-semibold text-navy'
                  : 'border-b-2 border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    idx === 0
                      ? 'bg-navy text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Section label */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Active & Due soon â€” {visibleCourses.length} courses
        </p>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <Eye className="size-3.5" aria-hidden="true" />
          Sort / Filter
        </button>
      </div>

      {/* Course grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {visibleCourses.map((course) => (
          <CourseCard key={course.title} course={course} />
        ))}
      </div>
    </div>
  );
}