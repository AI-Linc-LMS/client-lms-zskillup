import Link from 'next/link';
import {
  ArrowUpRight,
  BookOpen,
  BrainCircuit,
  Clock,
  Code2,
  Layers,
  MessageSquare,
  Sparkles,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { listCourses, type ApiCourseSummary } from '@/lib/api/catalog';
import { CATEGORY_LABEL, DIFFICULTY_TONE } from '@/lib/ui-maps';
import { StatusPill } from '@/components/student/StatusPill';
import { Reveal, Stagger, StaggerItem, AnimatedNumber } from '@/components/motion/primitives';

/**
 * My Learning — live course catalog (`GET /api/v1/courses`, Sprint 2). Cards
 * show catalog truth only: category, difficulty, duration. Per-student
 * enrollment + progress tracking ship with the Sprint 5 ledger — no numbers
 * are invented in the meantime.
 */

/** Per-category visual identity — the gradient drives real depth on each card
 *  (cover wash + glow + icon chip), not just a 2px top bar. */
const CATEGORY_IDENTITY: Record<
  string,
  { from: string; to: string; glow: string; icon: LucideIcon }
> = {
  APTITUDE: { from: '#3b82f6', to: '#4338ca', glow: '#2563eb', icon: BrainCircuit },
  PROGRAMMING_DSA: { from: '#14b8a6', to: '#047857', glow: '#0d9488', icon: Code2 },
  COMMUNICATION_HR: { from: '#8b5cf6', to: '#7c3aed', glow: '#6d3bf5', icon: MessageSquare },
  MOCK_DRIVE: { from: '#f7a14e', to: '#f37021', glow: '#f37021', icon: Target },
};

const FALLBACK_IDENTITY = {
  from: '#64748b',
  to: '#334155',
  glow: '#475569',
  icon: BookOpen,
} as const;

function identityFor(category: string) {
  return CATEGORY_IDENTITY[category] ?? FALLBACK_IDENTITY;
}

function CourseCard({ course }: { course: ApiCourseSummary }) {
  const identity = identityFor(course.category);
  const Icon = identity.icon;
  const difficulty = DIFFICULTY_TONE[course.difficulty];
  const label = CATEGORY_LABEL[course.category] ?? course.category;

  return (
    <Link
      href="/dashboard/company"
      className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_-18px_rgba(15,23,42,0.35)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_60px_-26px_rgba(15,23,42,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40 focus-visible:ring-offset-2"
    >
      {/* category-tinted cover — the gradient is the card's identity */}
      <div className="relative h-28 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${identity.from}, ${identity.to})` }}
        />
        {/* depth: dot texture + soft top highlight + bottom fade into the card */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage: 'radial-gradient(rgb(255 255 255 / 0.9) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/15"
        />
        {/* floating glass icon chip — scales on hover-lift */}
        <span className="absolute left-5 top-5 flex size-12 items-center justify-center rounded-2xl border border-white/25 bg-white/15 text-white shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)] backdrop-blur-sm transition-transform duration-300 group-hover:scale-105">
          <Icon className="size-6" aria-hidden="true" />
        </span>
        {/* category chip pinned to the cover */}
        <span className="absolute right-4 top-4 rounded-full border border-white/25 bg-black/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/95 backdrop-blur-sm">
          {label}
        </span>
      </div>

      {/* colored glow blob — bleeds up from behind the cover, intensifies on hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 right-6 size-36 rounded-full opacity-20 blur-3xl transition-opacity duration-500 group-hover:opacity-40"
        style={{ background: identity.glow }}
      />
      {/* faint gradient wash over the body for layered depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 top-28 bg-gradient-to-br from-slate-50/70 via-transparent to-transparent"
      />

      <div className="relative z-10 flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-[15px] font-bold leading-snug text-navy line-clamp-2 transition-colors group-hover:text-orange">
          {course.title}
        </h3>
        {course.summary ? (
          <p className="text-xs leading-relaxed text-slate-500 line-clamp-2">{course.summary}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-medium text-slate-400">
          <span className="flex items-center gap-1.5">
            <Layers className="size-3.5" aria-hidden="true" />
            Structured track
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden="true" />
            <span className="tabular-nums">{course.estimatedHours}h</span>
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          {difficulty ? <StatusPill tone={difficulty.tone} label={difficulty.label} /> : <span />}
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 transition-colors group-hover:text-orange">
            Open hub
            <span className="grid size-7 place-items-center rounded-full border border-slate-200 bg-white text-slate-400 transition-all duration-300 group-hover:border-orange/30 group-hover:bg-orange group-hover:text-white">
              <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:rotate-0 group-hover:scale-110" aria-hidden="true" />
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Groups courses by category in catalog order so the grid reads as a shelved
 *  library; preserves the original flat ordering within each group. */
function groupByCategory(courses: ApiCourseSummary[]): Array<{
  category: string;
  label: string;
  items: ApiCourseSummary[];
}> {
  const order: string[] = [];
  const buckets = new Map<string, ApiCourseSummary[]>();
  for (const course of courses) {
    if (!buckets.has(course.category)) {
      buckets.set(course.category, []);
      order.push(course.category);
    }
    buckets.get(course.category)!.push(course);
  }
  return order.map((category) => ({
    category,
    label: CATEGORY_LABEL[category] ?? category,
    items: buckets.get(category)!,
  }));
}

export default async function MyLearningPage() {
  let courses: ApiCourseSummary[] = [];
  try {
    courses = await listCourses();
  } catch {
    // Offline preview — render empty state below
  }

  const groups = groupByCategory(courses);
  const hasGroups = groups.length > 1;

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'My Learning' },
        ]}
      />

      {/* Page header — a confident, layered hero band */}
      <Reveal>
        <header className="relative isolate overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_-18px_rgba(15,23,42,0.35)] sm:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange/[0.06] via-transparent to-blue-500/[0.05]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-orange/20 opacity-50 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 left-1/4 size-56 rounded-full bg-violet-500/15 opacity-60 blur-3xl"
          />

          <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400 backdrop-blur">
                <Sparkles className="size-3 text-orange" aria-hidden="true" />
                Student Workspace
              </span>
              <h1 className="mt-3 text-[30px] font-extrabold leading-tight tracking-tight text-navy sm:text-[34px]">
                My Learning
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Every track, shelved in one place. Pick a path and pick up exactly where you left
                off.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
              <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-[#f7a14e] to-[#f37021] text-white shadow-sm">
                <BookOpen className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[26px] font-extrabold leading-none tracking-tight text-navy tabular-nums">
                  <AnimatedNumber value={courses.length} />
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Tracks available
                </p>
              </div>
            </div>
          </div>
        </header>
      </Reveal>

      {courses.length === 0 ? (
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-[0_8px_30px_-18px_rgba(15,23,42,0.35)]">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-50/80 via-transparent to-transparent"
            />
            <div className="relative z-10 mx-auto flex max-w-sm flex-col items-center">
              <span className="grid size-14 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
                <BookOpen className="size-6" aria-hidden="true" />
              </span>
              <p className="mt-4 text-base font-bold text-navy">No tracks loaded.</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                We couldn&apos;t reach the catalog right now. Try refreshing the page.
              </p>
            </div>
          </div>
        </Reveal>
      ) : hasGroups ? (
        <div className="space-y-10">
          {groups.map((group) => {
            const identity = identityFor(group.category);
            const GroupIcon = identity.icon;
            return (
              <section key={group.category} className="space-y-4">
                <div className="flex items-center gap-3">
                  <span
                    className="grid size-9 place-items-center rounded-xl text-white shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, ${identity.from}, ${identity.to})`,
                    }}
                  >
                    <GroupIcon className="size-[18px]" aria-hidden="true" />
                  </span>
                  <h2 className="text-lg font-extrabold tracking-tight text-navy">
                    {group.label}
                  </h2>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-slate-500">
                    {group.items.length}
                  </span>
                  <span aria-hidden className="ml-1 h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
                </div>
                <Stagger className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {group.items.map((c) => (
                    <StaggerItem key={c.slug} className="h-full">
                      <CourseCard course={c} />
                    </StaggerItem>
                  ))}
                </Stagger>
              </section>
            );
          })}
        </div>
      ) : (
        <Stagger className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((c) => (
            <StaggerItem key={c.slug} className="h-full">
              <CourseCard course={c} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}
