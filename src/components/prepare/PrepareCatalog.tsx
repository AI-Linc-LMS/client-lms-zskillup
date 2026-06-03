'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, Search, Sparkles, Star, Users, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { listCourses, type ApiCourseSummary } from '@/lib/api/catalog';

const DIFFICULTIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;
const TYPES = ['Self-paced course', 'Mock drive', 'Live cohort', 'Drill set'];
const RECRUITERS = ['TCS', 'Infosys', 'Wipro', 'Cognizant', 'Capgemini', 'Accenture', 'Amazon'];

/**
 * Sprint 3: prep tabs map 1:1 to the backend CourseCategory enum.
 * "All" is a catch-all that does not filter on category.
 */
const TABS: Array<{ label: string; category: ApiCourseSummary['category'] | 'ALL' }> = [
  { label: 'All Tracks', category: 'ALL' },
  { label: 'Aptitude & Reasoning', category: 'APTITUDE' },
  { label: 'Programming & DSA', category: 'PROGRAMMING_DSA' },
  { label: 'Communication & HR', category: 'COMMUNICATION_HR' },
  { label: 'Mock Drives', category: 'MOCK_DRIVE' },
];

const HERO_STATS = [
  { label: 'Students enrolled', value: '240,000+' },
  { label: 'Partner colleges', value: '1,200+' },
  { label: 'Average rating', value: '4.7★' },
  { label: 'Placement success', value: '82%' },
];

const RECRUITER_CHIPS = ['TCS', 'Infosys', 'Wipro', 'Cognizant', 'Capgemini', 'Accenture', '+24 more'];

export function PrepareHero() {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-navy p-8 text-white shadow-sm sm:p-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_100%_0%,rgba(243,112,33,0.18),transparent),radial-gradient(50%_50%_at_0%_100%,rgba(56,189,248,0.12),transparent)]"
      />
      <div className="relative">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">
          Catalog · Career preparation · Campus placement tracks
        </p>
        <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-[42px]">
          Land your first tech job with
          <br />
          <span className="text-orange">India&apos;s top recruiters.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/70">
          Structured preparation for TCS, Infosys, Wipro, Cognizant, Capgemini and Accenture. Real
          previous-year questions, live mock drives, expert instructors, and verified certificates
          accepted by 1,200+ campus placement cells.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {HERO_STATS.map((s) => (
            <div key={s.label}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
                {s.label}
              </p>
              <p className="mt-1 text-2xl font-extrabold sm:text-3xl">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="What do you want to learn? E.g. TCS NQT, Aptitude, DSA…"
              aria-label="Search tracks"
              className="h-12 w-full rounded-full border-0 bg-white pl-11 pr-32 text-sm text-navy placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40"
            />
            <button
              type="button"
              className="absolute right-1.5 top-1/2 inline-flex h-9 -translate-y-1/2 items-center rounded-full bg-navy px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Search
            </button>
          </div>
          <Link
            href="/dashboard/company/tcs"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-orange px-6 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-orange/90 active:translate-y-px"
          >
            <Sparkles className="size-4" aria-hidden="true" />
            Start with TCS NQT
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
            Aligned with hiring patterns of
          </span>
          {RECRUITER_CHIPS.map((r) => (
            <span
              key={r}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/85"
            >
              {r}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Maps backend course category → tailwind gradient for the card banner. */
const CATEGORY_ACCENT: Record<ApiCourseSummary['category'], string> = {
  APTITUDE: 'from-teal-600 to-emerald-700',
  PROGRAMMING_DSA: 'from-blue-700 to-indigo-900',
  COMMUNICATION_HR: 'from-rose-500 to-red-600',
  MOCK_DRIVE: 'from-orange-500 to-amber-600',
};

const CATEGORY_LABEL: Record<ApiCourseSummary['category'], string> = {
  APTITUDE: 'Aptitude',
  PROGRAMMING_DSA: 'Programming · DSA',
  COMMUNICATION_HR: 'Communication · HR',
  MOCK_DRIVE: 'Mock drive',
};

export function PrepareCatalog() {
  const [activeTab, setActiveTab] = useState(0);
  const [difficulty, setDifficulty] = useState<'ALL' | (typeof DIFFICULTIES)[number]>('ALL');
  const [courses, setCourses] = useState<ApiCourseSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch on tab change. Difficulty is applied client-side to avoid refetching.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const filters: { category?: string } = {};
    const tab = TABS[activeTab];
    if (tab.category !== 'ALL') filters.category = tab.category;
    listCourses(filters)
      .then((rows) => {
        if (!cancelled) setCourses(rows);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setCourses([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  const filtered = useMemo(() => {
    if (!courses) return [];
    if (difficulty === 'ALL') return courses;
    return courses.filter((c) => c.difficulty === difficulty);
  }, [courses, difficulty]);

  return (
    <div>
      {/* Tab strip */}
      <div
        className="-mx-1 mb-6 flex gap-1 overflow-x-auto border-b border-slate-200 px-1"
        role="tablist"
        aria-label="Track categories"
      >
        {TABS.map((t, i) => {
          const active = activeTab === i;
          return (
            <button
              key={t.label}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(i)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 border-b-2 px-3 pb-3 pt-2 text-sm font-medium transition-colors',
                active
                  ? 'border-orange font-semibold text-navy'
                  : 'border-transparent text-slate-400 hover:text-slate-600',
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[15rem_1fr]">
        {/* Refine sidebar */}
        <aside className="hidden lg:block">
          <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-navy">Refine results</p>
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Difficulty
              </p>
              <div className="flex flex-col gap-1.5">
                {(['ALL', ...DIFFICULTIES] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={cn(
                      'rounded-md px-2.5 py-1.5 text-left text-xs font-medium transition-colors',
                      difficulty === d
                        ? 'bg-navy text-white'
                        : 'text-slate-600 hover:bg-slate-100',
                    )}
                  >
                    {d === 'ALL' ? 'All levels' : d.charAt(0) + d.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
            <FilterGroup title="Recruiter" options={RECRUITERS} />
            <FilterGroup title="Type" options={TYPES} />
          </div>
        </aside>

        {/* Results */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Showing <span className="font-semibold text-navy">{filtered.length}</span> of {courses?.length ?? 0} tracks
            </p>
            <label className="flex items-center gap-2 text-xs text-slate-500">
              Sort by
              <select className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30">
                <option>Best match</option>
                <option>Most enrolled</option>
                <option>Newest</option>
              </select>
            </label>
          </div>

          {loading ? (
            <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-16">
              <Loader2 className="size-5 animate-spin text-slate-400" aria-hidden="true" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              Could not load tracks: {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              No tracks match these filters yet.
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((c) => (
                <TrackCard key={c.slug} course={c} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ title, options }: { title: string; options: string[] }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        {title}
      </p>
      <ul className="space-y-2">
        {options.map((o) => (
          <li key={o} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              id={`${title}-${o}`}
              className="size-3.5 rounded border-slate-300 text-orange focus:ring-orange/40"
            />
            <label htmlFor={`${title}-${o}`} className="cursor-pointer text-slate-600 hover:text-navy">
              {o}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TrackCard({ course }: { course: ApiCourseSummary }) {
  const accent = CATEGORY_ACCENT[course.category];
  const code = course.slug.slice(0, 3).toUpperCase();
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className={cn('relative flex h-32 items-center justify-center bg-gradient-to-br', accent)}>
        <span className="text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
          {code}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {CATEGORY_LABEL[course.category]} · {course.difficulty.charAt(0) + course.difficulty.slice(1).toLowerCase()}
        </p>
        <p className="mt-1 text-sm font-bold leading-snug text-navy">{course.title}</p>
        {course.summary ? (
          <p className="mt-1 text-xs leading-relaxed text-slate-500 line-clamp-2">{course.summary}</p>
        ) : null}
        <div className="mt-auto flex items-center justify-between pt-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden="true" />
            <span className="font-semibold text-navy">4.7</span>
          </span>
          <span className="flex items-center gap-1">
            <Users className="size-3" aria-hidden="true" /> 10k+
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3" aria-hidden="true" /> {course.estimatedHours}h
          </span>
          <Link
            href={`/dashboard/company`}
            className="inline-flex items-center gap-1 font-semibold text-navy transition-colors hover:text-orange"
          >
            View →
          </Link>
        </div>
      </div>
    </article>
  );
}
