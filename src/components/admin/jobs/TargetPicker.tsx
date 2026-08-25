'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Globe2, Loader2, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getJobReach, getJobTargets, setJobTargets } from '@/lib/api/jobs';
import type { JobTargetViewDto } from '@/shared/dto/jobs.dto';
import { JobTargetType } from '@/shared/enums';
import {
  listAdminCollegeCohorts,
  listAdminColleges,
  listAdminCompanies,
} from '@/lib/api/admin';
import { describeError } from '@/lib/api/errors';
import { cn } from '@/lib/utils';

interface Option {
  id: string;
  name: string;
  type: JobTargetType;
  hint?: string;
}

const TYPE_LABEL: Record<JobTargetType, string> = {
  [JobTargetType.COLLEGE]: 'College',
  [JobTargetType.COHORT]: 'Cohort',
  [JobTargetType.USER]: 'Student',
  [JobTargetType.COMPANY]: 'Drive registrants',
};

/**
 * Who this posting is for.
 *
 * The empty state is the important one, and it is stated rather than implied: no
 * targets means PUBLIC. An admin who assumes the opposite - that a fresh posting is
 * private until they say otherwise - publishes a confidential requisition to the whole
 * platform, and nothing about a blank list would have told them.
 *
 * The reach count is shown live for the same reason: adding one college is the moment
 * a posting stops being public, and that consequence should be visible at the click,
 * not discovered later when nobody applies.
 */
export function TargetPicker({ jobId }: { jobId: string }) {
  const [targets, setTargets] = useState<JobTargetViewDto[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [reach, setReach] = useState<{ isPublic: boolean; students: number } | null>(null);
  const [query, setQuery] = useState('');
  const [type, setType] = useState<JobTargetType>(JobTargetType.COLLEGE);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [colleges, setColleges] = useState<Array<{ id: string; name: string }>>([]);
  const [cohortCollege, setCohortCollege] = useState('');
  const [cohorts, setCohorts] = useState<
    Array<{ id: string; name: string; year: number | null; studentCount: number }>
  >([]);

  const refresh = async () => {
    const [t, r] = await Promise.all([getJobTargets(jobId), getJobReach(jobId)]);
    setTargets(t);
    setReach(r);
  };

  useEffect(() => {
    let alive = true;
    Promise.all([
      getJobTargets(jobId),
      getJobReach(jobId),
      listAdminColleges().catch(() => []),
      listAdminCompanies().catch(() => []),
    ])
      .then(([t, r, colleges, companies]) => {
        if (!alive) return;
        setTargets(t);
        setReach(r);
        setColleges(colleges.filter((c) => c.status !== 'SUSPENDED'));
        setOptions([
          ...colleges
            .filter((c) => c.status !== 'SUSPENDED')
            .map((c) => ({ id: c.id, name: c.name, type: JobTargetType.COLLEGE, hint: c.city })),
          ...companies.map((c) => ({ id: c.id, name: c.name, type: JobTargetType.COMPANY })),
        ]);
      })
      .catch((err) => toast.error(describeError(err, 'Could not load the audience.')))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [jobId]);

  // Cohorts belong to a college, so picking one is a two-step choice - which is also
  // how an admin thinks about it ("RCOEM, the 2026 batch") rather than hunting a flat
  // list of every cohort on the platform for a name that repeats across colleges.
  useEffect(() => {
    if (type !== JobTargetType.COHORT || !cohortCollege) {
      setCohorts([]);
      return;
    }
    let alive = true;
    listAdminCollegeCohorts(cohortCollege)
      .then((rows) => alive && setCohorts(rows))
      .catch(() => alive && setCohorts([]));
    return () => {
      alive = false;
    };
  }, [type, cohortCollege]);

  const chosen = useMemo(() => new Set(targets.map((t) => `${t.targetType}:${t.targetId}`)), [targets]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool: Option[] =
      type === JobTargetType.COHORT
        ? cohorts.map((c) => ({
            id: c.id,
            name: c.name,
            type: JobTargetType.COHORT,
            hint: `${c.studentCount} student${c.studentCount === 1 ? '' : 's'}`,
          }))
        : options.filter((o) => o.type === type);
    return pool
      .filter((o) => !chosen.has(`${o.type}:${o.id}`))
      .filter((o) => (q ? o.name.toLowerCase().includes(q) : true))
      .slice(0, 8);
  }, [options, cohorts, type, query, chosen]);

  const commit = async (next: JobTargetViewDto[]) => {
    setSaving(true);
    try {
      await setJobTargets(
        jobId,
        next.map((t) => ({ targetType: t.targetType, targetId: t.targetId })),
      );
      await refresh();
    } catch (err) {
      toast.error(describeError(err, 'Could not save the audience.'));
    } finally {
      setSaving(false);
    }
  };

  const add = (o: Option) => {
    setQuery('');
    void commit([...targets, { targetType: o.type, targetId: o.id, label: o.name }]);
  };

  const remove = (t: JobTargetViewDto) =>
    void commit(targets.filter((x) => !(x.targetType === t.targetType && x.targetId === t.targetId)));

  if (loading) {
    return (
      <div className="grid place-items-center py-10">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* The consequence of the current selection, said plainly. */}
      <div
        className={cn(
          'flex items-start gap-2.5 rounded-xl p-4 ring-1',
          reach?.isPublic
            ? 'bg-sky-50 text-sky-800 ring-sky-200'
            : 'bg-amber-50 text-amber-800 ring-amber-200',
        )}
      >
        {reach?.isPublic ? (
          <Globe2 className="mt-0.5 size-4 shrink-0" />
        ) : (
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        )}
        <div className="text-sm">
          <p className="font-bold">
            {reach?.isPublic
              ? 'Public - anyone can see this, signed in or not'
              : `Private - reaches about ${reach?.students ?? 0} ${reach?.students === 1 ? 'student' : 'students'}`}
          </p>
          <p className="mt-0.5 leading-relaxed">
            {reach?.isPublic
              ? 'Add an audience below to restrict it. With none set, the posting is on the public board and in the sitemap.'
              : 'Only these students see it - on the board and by direct link. Every audience you add WIDENS reach.'}
          </p>
        </div>
      </div>

      {targets.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {targets.map((t) => (
            <span
              key={`${t.targetType}:${t.targetId}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pl-3 pr-1.5 text-xs font-semibold text-slate-700"
            >
              <span className="text-slate-400">{TYPE_LABEL[t.targetType]}</span>
              {t.label ?? (
                <span className="italic text-slate-400">no longer exists</span>
              )}
              <button
                type="button"
                aria-label={`Remove ${t.label ?? 'audience'}`}
                onClick={() => remove(t)}
                disabled={saving}
                className="grid size-5 place-items-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap gap-2">
          {Object.values(JobTargetType)
            .filter((t) => t !== JobTargetType.USER)
            .map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                aria-pressed={type === t}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                  type === t ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                {TYPE_LABEL[t]}
              </button>
            ))}
        </div>

        {type === JobTargetType.COHORT ? (
          <label className="mt-3 block">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              College
            </span>
            <select
              value={cohortCollege}
              onChange={(e) => setCohortCollege(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
            >
              <option value="">Pick a college first…</option>
              {colleges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${TYPE_LABEL[type].toLowerCase()}…`}
            aria-label={`Search ${TYPE_LABEL[type]}`}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
          />
        </div>

        {matches.length > 0 ? (
          <ul className="mt-2 divide-y divide-slate-100">
            {matches.map((o) => (
              <li key={`${o.type}:${o.id}`}>
                <button
                  type="button"
                  onClick={() => add(o)}
                  disabled={saving}
                  className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm text-navy hover:text-orange"
                >
                  <span className="truncate">
                    {o.name}
                    {o.hint ? <span className="ml-1.5 text-xs text-slate-400">{o.hint}</span> : null}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">Add</span>
                </button>
              </li>
            ))}
          </ul>
        ) : query.trim() ? (
          <p className="mt-3 text-sm text-slate-500">Nothing matches that.</p>
        ) : null}
      </div>

      {saving ? (
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="size-3.5 animate-spin" /> Saving…
        </p>
      ) : null}
    </div>
  );
}
