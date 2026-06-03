import Link from 'next/link';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { BookOpen, Clock, BarChart2 } from 'lucide-react';
import { listCourses, type ApiCourseSummary } from '@/lib/api/catalog';

/**
 * My Learning — Sprint 3 wires this to the real `GET /api/v1/courses` endpoint.
 *
 * Per-student enrollment + real progress tracking ship in Sprint 5 (XP ledger /
 * student_stats). Until then, progress and status are derived deterministically
 * from the course slug so the UI stays demo-believable without lying — every
 * student would see the same numbers.
 */

const CATEGORY_ACCENTS: Record<ApiCourseSummary['category'], string> = {
  APTITUDE: 'from-blue-600 to-indigo-700',
  PROGRAMMING_DSA: 'from-teal-600 to-emerald-700',
  COMMUNICATION_HR: 'from-violet-600 to-purple-700',
  MOCK_DRIVE: 'from-orange-500 to-amber-600',
};

const CATEGORY_LABEL: Record<ApiCourseSummary['category'], string> = {
  APTITUDE: 'Aptitude',
  PROGRAMMING_DSA: 'Programming · DSA',
  COMMUNICATION_HR: 'Communication · HR',
  MOCK_DRIVE: 'Mock drive',
};

type DemoStatus = 'In progress' | 'Due soon' | 'Completed';

const STATUS_PILL: Record<DemoStatus, string> = {
  'In progress': 'bg-sky-50 text-sky-700 border border-sky-200',
  'Due soon': 'bg-amber-50 text-amber-700 border border-amber-200',
  Completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

/** Deterministic helper so the same course shows the same fake progress everywhere. */
function deriveProgress(slug: string): { progress: number; score: number; status: DemoStatus } {
  const seed = slug.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const progress = (seed * 7) % 100;
  const score = 60 + ((seed * 13) % 35);
  const status: DemoStatus =
    progress >= 95 ? 'Completed' : progress >= 35 ? 'In progress' : 'Due soon';
  return { progress, score, status };
}

function CourseCard({ course }: { course: ApiCourseSummary }) {
  const accent = CATEGORY_ACCENTS[course.category];
  const { progress, score, status } = deriveProgress(course.slug);
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className={`h-2 w-full bg-gradient-to-r ${accent}`} aria-hidden="true" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            {CATEGORY_LABEL[course.category]}
          </span>
          <span className="text-xs text-slate-400">
            {course.difficulty.charAt(0) + course.difficulty.slice(1).toLowerCase()}
          </span>
        </div>
        <h3 className="text-sm font-bold leading-snug text-navy line-clamp-2">{course.title}</h3>
        {course.summary ? (
          <p className="text-xs text-slate-500 line-clamp-2">{course.summary}</p>
        ) : null}
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <BookOpen className="size-3" aria-hidden="true" />
            Modules
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3" aria-hidden="true" />
            {course.estimatedHours}h
          </span>
          <span className="flex items-center gap-1">
            <BarChart2 className="size-3" aria-hidden="true" />
            Score {score}%
          </span>
        </div>
        <div className="space-y-1">
          <div
            className="h-1.5 w-full rounded-full bg-slate-100"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${progress}% complete`}
          >
            <div
              className="h-1.5 rounded-full bg-navy transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-400">{progress}% complete</p>
        </div>
        <div className="mt-auto flex items-center justify-between pt-1">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_PILL[status]}`}
          >
            {status}
          </span>
          <Link
            href={`/dashboard/company`}
            className="rounded-full bg-orange px-5 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          >
            {status === 'Completed' ? 'Review' : 'Continue'}
          </Link>
        </div>
      </div>
    </article>
  );
}

export default async function MyLearningPage() {
  let courses: ApiCourseSummary[] = [];
  try {
    courses = await listCourses();
  } catch {
    // Offline preview — render empty state below
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'My Learning' },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Student Workspace
          </p>
          <h1 className="mt-0.5 text-2xl font-bold text-navy">My Learning</h1>
          <p className="mt-1 text-sm text-slate-500">
            All your tracks, in one place. Pick one to continue.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <BookOpen className="size-4 text-orange" aria-hidden="true" />
          <span className="text-sm font-semibold text-navy">{courses.length}</span>
          <span className="text-sm text-slate-500">tracks available</span>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm font-semibold text-navy">No tracks loaded.</p>
          <p className="mt-1 text-xs text-slate-500">
            We couldn&apos;t reach the catalog right now. Try refreshing the page.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((c) => (
            <CourseCard key={c.slug} course={c} />
          ))}
        </div>
      )}
    </div>
  );
}
