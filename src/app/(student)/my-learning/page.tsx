import Link from 'next/link';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { BookOpen, Clock } from 'lucide-react';
import { listCourses, type ApiCourseSummary } from '@/lib/api/catalog';
import { CATEGORY_LABEL, DIFFICULTY_TONE } from '@/lib/ui-maps';
import { StatusPill } from '@/components/student/StatusPill';
import { Button } from '@/components/ui/button';

/**
 * My Learning — live course catalog (`GET /api/v1/courses`, Sprint 2). Cards
 * show catalog truth only: category, difficulty, duration. Per-student
 * enrollment + progress tracking ship with the Sprint 5 ledger — no numbers
 * are invented in the meantime.
 */

const CATEGORY_ACCENTS: Record<ApiCourseSummary['category'], string> = {
  APTITUDE: 'from-blue-600 to-indigo-700',
  PROGRAMMING_DSA: 'from-teal-600 to-emerald-700',
  COMMUNICATION_HR: 'from-violet-600 to-purple-700',
  MOCK_DRIVE: 'from-orange-500 to-amber-600',
};

function CourseCard({ course }: { course: ApiCourseSummary }) {
  const accent = CATEGORY_ACCENTS[course.category];
  const difficulty = DIFFICULTY_TONE[course.difficulty];
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className={`h-2 w-full bg-gradient-to-r ${accent}`} aria-hidden="true" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            {CATEGORY_LABEL[course.category]}
          </span>
        </div>
        <h3 className="text-sm font-bold leading-snug text-navy line-clamp-2">{course.title}</h3>
        {course.summary ? (
          <p className="text-xs text-slate-500 line-clamp-2">{course.summary}</p>
        ) : null}
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <BookOpen className="size-3" aria-hidden="true" />
            Structured track
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3" aria-hidden="true" />
            {course.estimatedHours}h
          </span>
        </div>
        <div className="mt-auto flex items-center justify-between pt-1">
          {difficulty ? <StatusPill tone={difficulty.tone} label={difficulty.label} /> : null}
          <Button asChild size="sm">
            <Link href="/dashboard/company">Open hub</Link>
          </Button>
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
          <h1 className="mt-0.5 text-[28px] font-extrabold tracking-tight text-navy">My Learning</h1>
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
