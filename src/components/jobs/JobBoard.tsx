'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Briefcase, Loader2, Search, SlidersHorizontal, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { JobCard } from './JobCard';
import {
  getJobFacets,
  listJobs,
  listSavedJobSlugs,
  toggleSaveJob,
  type JobFacets,
} from '@/lib/api/jobs';
import type { JobPostingDto } from '@/shared/dto/jobs.dto';
import { EmploymentType, WorkMode } from '@/shared/enums';
import { EMPLOYMENT_LABEL, WORK_MODE_LABEL } from '@/lib/jobs/format';
import { roleHint } from '@/lib/session-hints';
import { cn } from '@/lib/utils';

const PAGE = 12;

/** A pill filter. Selected is navy, per the design system's filter-chip rule. */
function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
        active ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
      )}
    >
      {children}
    </button>
  );
}

/**
 * The board.
 *
 * Filtering happens on the SERVER, not over a fetched array. An admin can target a
 * posting at a single cohort, so "fetch everything and filter here" would quietly drop
 * a student's own jobs off the end of somebody else's page.
 *
 * The search box is debounced rather than submitted: typing and waiting is how people
 * expect a job search to behave, and a Search button on a list this size is a click
 * that buys nothing.
 */
export function JobBoard() {
  const [items, setItems] = useState<JobPostingDto[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<JobFacets | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(0);

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [workMode, setWorkMode] = useState<WorkMode[]>([]);
  const [employment, setEmployment] = useState<EmploymentType[]>([]);
  const [company, setCompany] = useState<string | null>(null);
  const [openOnly, setOpenOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [saved, setSaved] = useState<Set<string>>(new Set());
  const signedIn = useRef(false);

  useEffect(() => {
    signedIn.current = roleHint() !== null;
    if (signedIn.current) {
      listSavedJobSlugs()
        .then((slugs) => setSaved(new Set(slugs)))
        .catch(() => undefined);
    }
    getJobFacets()
      .then(setFacets)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Any filter change resets to the first page. Without this, narrowing a filter while
  // on page 3 shows an empty page and reads as "no results".
  useEffect(() => {
    setPage(0);
  }, [debounced, workMode, employment, company, openOnly]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listJobs({
      search: debounced || undefined,
      workMode: workMode.length ? workMode : undefined,
      employmentType: employment.length ? employment : undefined,
      companyName: company ?? undefined,
      openOnly: openOnly || undefined,
      limit: PAGE,
      offset: page * PAGE,
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
  }, [debounced, workMode, employment, company, openOnly, page]);

  const toggle = useCallback(<T,>(list: T[], value: T, set: (v: T[]) => void) => {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }, []);

  const onToggleSave = useCallback(async (slug: string) => {
    if (!signedIn.current) {
      toast.error('Sign in to save a role for later.');
      return;
    }
    // Optimistic: a bookmark that waits for a round trip feels broken.
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
  }, []);

  const activeFilters =
    workMode.length + employment.length + (company ? 1 : 0) + (openOnly ? 1 : 0);

  const clearAll = () => {
    setWorkMode([]);
    setEmployment([]);
    setCompany(null);
    setOpenOnly(false);
    setSearch('');
  };

  const pages = Math.ceil(total / PAGE);
  const showing = useMemo(
    () => (total === 0 ? '0' : `${page * PAGE + 1}-${Math.min((page + 1) * PAGE, total)}`),
    [page, total],
  );

  return (
    <div className="space-y-5">
      {/* Search + filter toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by role, company or location"
            aria-label="Search jobs"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-navy placeholder:text-slate-400 focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
        >
          <SlidersHorizontal className="size-4" /> Filters
          {activeFilters > 0 ? (
            <span className="ml-1 rounded-full bg-orange px-1.5 text-[11px] font-bold text-white">
              {activeFilters}
            </span>
          ) : null}
        </Button>
      </div>

      {showFilters ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Work mode
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(facets?.workModes ?? Object.values(WorkMode)).map((m) => (
                  <Chip
                    key={m}
                    active={workMode.includes(m as WorkMode)}
                    onClick={() => toggle(workMode, m as WorkMode, setWorkMode)}
                  >
                    {WORK_MODE_LABEL[m as WorkMode] ?? m}
                  </Chip>
                ))}
              </div>
            </div>

            {(facets?.employmentTypes.length ?? 0) > 0 ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Type
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {facets!.employmentTypes.map((t) => (
                    <Chip
                      key={t}
                      active={employment.includes(t as EmploymentType)}
                      onClick={() => toggle(employment, t as EmploymentType, setEmployment)}
                    >
                      {EMPLOYMENT_LABEL[t as EmploymentType] ?? t}
                    </Chip>
                  ))}
                </div>
              </div>
            ) : null}

            {(facets?.companies.length ?? 0) > 1 ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Company
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {facets!.companies.slice(0, 14).map((c) => (
                    <Chip key={c} active={company === c} onClick={() => setCompany(company === c ? null : c)}>
                      {c}
                    </Chip>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
              <Chip active={openOnly} onClick={() => setOpenOnly((v) => !v)}>
                Only roles still open
              </Chip>
              {activeFilters > 0 ? (
                <button
                  type="button"
                  onClick={clearAll}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-navy"
                >
                  <X className="size-3.5" /> Clear all
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <p className="text-xs text-slate-500">
        {loading ? 'Searching…' : `Showing ${showing} of ${total} ${total === 1 ? 'role' : 'roles'}`}
      </p>

      {error ? (
        <div
          role="alert"
          className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200"
        >
          Could not load the board. Refresh to try again.
        </div>
      ) : loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <span className="mx-auto grid size-11 place-items-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
            <Briefcase className="size-5" />
          </span>
          <p className="mt-3 text-base font-bold text-navy">
            {activeFilters > 0 || debounced ? 'Nothing matches those filters' : 'No openings right now'}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-slate-600">
            {activeFilters > 0 || debounced
              ? 'Try widening the search - or clear the filters to see everything on the board.'
              : 'New roles from our hiring partners appear here as they open. Worth checking back.'}
          </p>
          {activeFilters > 0 || debounced ? (
            <Button variant="outline" className="mt-4" onClick={clearAll}>
              Clear filters
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              saved={saved.has(job.slug)}
              onToggleSave={onToggleSave}
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
  );
}
