'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Briefcase, LayoutGrid, List, Loader2, SlidersHorizontal, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { JobCard } from './JobCard';
import { JobRow } from './JobRow';
import { JobSearchBar } from './JobSearchBar';
import {
  activeFilterCount,
  EMPTY_FILTERS,
  JobFilterRail,
  type JobFilterState,
} from './JobFilterRail';
import { MyApplications } from './MyApplications';
import { SavedJobs } from './SavedJobs';
import {
  getJobFacets,
  listJobs,
  listMyApplications,
  listSavedJobSlugs,
  toggleSaveJob,
  type JobFacets,
} from '@/lib/api/jobs';
import type { JobPostingDto } from '@/shared/dto/jobs.dto';
import { roleHint } from '@/lib/session-hints';
import { cn } from '@/lib/utils';

type Tab = 'browse' | 'applied' | 'saved';

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'browse', label: 'Browse Jobs' },
  { key: 'applied', label: 'Applied Jobs' },
  { key: 'saved', label: 'Saved' },
];

/**
 * The jobs workspace.
 *
 * Browsing, what you applied to, and what you saved are three views of the SAME thing,
 * so they are tabs on one page rather than three sidebar entries. A student checking
 * "did I apply to this?" is mid-browse; sending them to a different route to find out
 * loses their filters and their place.
 *
 * Counts sit on the tabs because they are the answer to a question people actually
 * have ("how many did I apply to?") and it costs two cheap calls to know.
 */
export function JobsWorkspace({ initialTab = 'browse' }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [perPage, setPerPage] = useState(12);
  const [page, setPage] = useState(0);

  const [items, setItems] = useState<JobPostingDto[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<JobFacets | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [railOpen, setRailOpen] = useState(false);

  // The search bar is submitted; the rail applies immediately. Two different rhythms
  // on purpose - typing three fields and having each keystroke re-query feels broken,
  // ticking a chip and waiting for a button feels dead.
  const [keyword, setKeyword] = useState('');
  const [experience, setExperience] = useState('');
  const [location, setLocation] = useState('');
  const [query, setQuery] = useState({ keyword: '', experience: '', location: '' });
  const [filters, setFilters] = useState<JobFilterState>(EMPTY_FILTERS);

  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [appliedSlugs, setAppliedSlugs] = useState<Set<string>>(new Set());
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const hint = roleHint();
    setSignedIn(hint !== null);
    if (hint) {
      listSavedJobSlugs()
        .then((s) => setSaved(new Set(s)))
        .catch(() => undefined);
      listMyApplications()
        .then((a) => setAppliedSlugs(new Set(a.map((x) => x.jobSlug))))
        .catch(() => undefined);
    }
    getJobFacets()
      .then(setFacets)
      .catch(() => undefined);
  }, []);

  useEffect(() => setPage(0), [query, filters, perPage]);

  useEffect(() => {
    if (tab !== 'browse') return;
    let alive = true;
    setLoading(true);
    listJobs({
      search: query.keyword || undefined,
      experience: query.experience || undefined,
      location: query.location || undefined,
      jobKind: filters.jobKind || undefined,
      employmentType: filters.employmentType.length ? filters.employmentType : undefined,
      workMode: filters.workMode.length ? filters.workMode : undefined,
      companyName: filters.companyName || undefined,
      passoutYear: filters.passoutYear ? Number(filters.passoutYear) : undefined,
      openOnly: filters.openOnly || undefined,
      skills: filters.skills.length ? filters.skills : undefined,
      limit: perPage,
      offset: page * perPage,
    })
      .then((r) => {
        if (!alive) return;
        setItems(r.items);
        setTotal(r.total);
        setError(false);
      })
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [tab, query, filters, page, perPage]);

  const onToggleSave = useCallback(
    async (slug: string) => {
      if (!signedIn) {
        toast.error('Sign in to save a role for later.');
        return;
      }
      setSaved((prev) => {
        const next = new Set(prev);
        if (next.has(slug)) next.delete(slug);
        else next.add(slug);
        return next;
      });
      try {
        await toggleSaveJob(slug);
      } catch {
        setSaved((prev) => {
          const next = new Set(prev);
          if (next.has(slug)) next.delete(slug);
          else next.add(slug);
          return next;
        });
        toast.error('Could not save that. Try again.');
      }
    },
    [signedIn],
  );

  const pages = Math.ceil(total / perPage);
  const active = activeFilterCount(filters);
  const showing = useMemo(
    () =>
      total === 0
        ? '0'
        : `${page * perPage + 1}-${Math.min((page + 1) * perPage, total)}`,
    [page, perPage, total],
  );

  const rail = (
    <JobFilterRail
      facets={facets}
      value={filters}
      onChange={setFilters}
      className={cn(railOpen ? 'block' : 'hidden lg:block')}
    />
  );

  return (
    <div className="space-y-5">
      <JobSearchBar
        keyword={keyword}
        experience={experience}
        location={location}
        locations={facets?.locations ?? []}
        onKeyword={setKeyword}
        onExperience={setExperience}
        onLocation={setLocation}
        onSubmit={() => setQuery({ keyword, experience, location })}
      />

      {/* Underline tabs, per the design system - never pills for a view switch. */}
      <div className="flex gap-6 border-b border-slate-200">
        {TABS.map((t) => {
          const on = tab === t.key;
          const count =
            t.key === 'applied' ? appliedSlugs.size : t.key === 'saved' ? saved.size : undefined;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-current={on ? 'page' : undefined}
              className={cn(
                '-mb-px flex items-center gap-2 border-b-2 pb-2.5 text-sm transition-colors',
                on
                  ? 'border-orange font-semibold text-navy'
                  : 'border-transparent text-slate-400 hover:text-slate-600',
              )}
            >
              {t.label}
              {count !== undefined && count > 0 ? (
                <span
                  className={cn(
                    'rounded-full px-1.5 text-[11px] font-bold',
                    on ? 'bg-orange text-white' : 'bg-slate-100 text-slate-500',
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {tab === 'applied' ? (
        <MyApplications />
      ) : tab === 'saved' ? (
        <SavedJobs savedSlugs={saved} onToggleSave={onToggleSave} appliedSlugs={appliedSlugs} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-6 lg:self-start">
            {/* The rail is a drawer on small screens - a 260px column beside a job card
                on a phone leaves neither enough room to be read. */}
            <Button
              type="button"
              variant="outline"
              className="w-full lg:hidden"
              onClick={() => setRailOpen((v) => !v)}
              aria-expanded={railOpen}
            >
              <SlidersHorizontal className="size-4" /> Filters
              {active > 0 ? (
                <span className="ml-1 rounded-full bg-orange px-1.5 text-[11px] font-bold text-white">
                  {active}
                </span>
              ) : null}
            </Button>
            <div className={cn('mt-3 lg:mt-0')}>{rail}</div>
          </div>

          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-500">
                {loading ? (
                  'Searching…'
                ) : (
                  <>
                    <span className="font-semibold text-navy">{total}</span>{' '}
                    {total === 1 ? 'job' : 'jobs'} found
                    {total > 0 ? <span className="text-slate-400"> · showing {showing}</span> : null}
                  </>
                )}
              </p>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-slate-500">
                  Per page
                  <select
                    value={perPage}
                    onChange={(e) => setPerPage(Number(e.target.value))}
                    aria-label="Results per page"
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
                  >
                    {[12, 24, 48].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                  {(
                    [
                      { key: 'grid' as const, icon: LayoutGrid, label: 'Grid view' },
                      { key: 'list' as const, icon: List, label: 'List view' },
                    ]
                  ).map(({ key, icon: Icon, label }) => (
                    <button
                      key={key}
                      type="button"
                      aria-label={label}
                      aria-pressed={view === key}
                      onClick={() => setView(key)}
                      className={cn(
                        'grid size-7 place-items-center rounded-md transition-colors',
                        view === key ? 'bg-white text-navy shadow-sm' : 'text-slate-400 hover:text-navy',
                      )}
                    >
                      <Icon className="size-4" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {active > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400">Filtered by</span>
                {[
                  ...(filters.jobKind ? [filters.jobKind] : []),
                  ...filters.employmentType,
                  ...filters.workMode,
                  ...(filters.companyName ? [filters.companyName] : []),
                  ...(filters.passoutYear ? [`Passout ${filters.passoutYear}`] : []),
                  ...(filters.openOnly ? ['Open roles only'] : []),
                  ...filters.skills,
                ].map((f) => (
                  <span
                    key={f}
                    className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600"
                  >
                    {f}
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => setFilters(EMPTY_FILTERS)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-navy"
                >
                  <X className="size-3" /> Clear
                </button>
              </div>
            ) : null}

            {error ? (
              <div
                role="alert"
                className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200"
              >
                Could not load the board. Refresh to try again.
              </div>
            ) : loading ? (
              <div
                className={cn(view === 'grid' ? 'grid gap-5 sm:grid-cols-2 xl:grid-cols-3' : 'space-y-3')}
                aria-busy="true"
              >
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={cn('animate-pulse rounded-xl bg-slate-100', view === 'grid' ? 'h-56' : 'h-28')}
                  />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <span className="mx-auto grid size-11 place-items-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
                  <Briefcase className="size-5" />
                </span>
                <p className="mt-3 text-base font-bold text-navy">
                  {active > 0 || query.keyword ? 'Nothing matches those filters' : 'No openings right now'}
                </p>
                <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-slate-600">
                  {active > 0 || query.keyword
                    ? 'Try widening the search - or clear the filters to see everything on the board.'
                    : 'New roles from our hiring partners appear here as they open. Worth checking back.'}
                </p>
                {active > 0 || query.keyword ? (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setFilters(EMPTY_FILTERS);
                      setKeyword('');
                      setExperience('');
                      setLocation('');
                      setQuery({ keyword: '', experience: '', location: '' });
                    }}
                  >
                    Clear everything
                  </Button>
                ) : null}
              </div>
            ) : view === 'grid' ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    saved={saved.has(job.slug)}
                    onToggleSave={onToggleSave}
                    applied={appliedSlugs.has(job.slug)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((job) => (
                  <JobRow
                    key={job.id}
                    job={job}
                    saved={saved.has(job.slug)}
                    onToggleSave={onToggleSave}
                    applied={appliedSlugs.has(job.slug)}
                  />
                ))}
              </div>
            )}

            {pages > 1 ? (
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <span className="text-xs font-semibold text-slate-500">
                  Page {page + 1} of {pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page + 1 >= pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            ) : null}

            {loading && items.length > 0 ? (
              <div className="flex justify-center">
                <Loader2 className="size-5 animate-spin text-slate-400" />
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
