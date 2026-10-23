'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Download, Loader2, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { describeError } from '@/lib/api/errors';
import { saveBlob } from '@/lib/download';
import {
  exportApplications,
  getApplicationCompanies,
  getApplicationDrives,
  getApplicationSearchOptions,
  searchApplications,
  type ApplicationSearchFilters,
} from '@/lib/api/jobs';
import type {
  ApplicationSearchResult,
  CompanyFacet,
  DriveFacet,
  SavedApplicationView,
} from '@/shared/application-search';
import { APPLICATION_SOURCE_LABELS } from '@/shared/drive-roster-import';
import { STAGE_LABELS } from '@/shared/application-pipeline';

const inputCls =
  'h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30';
const eyebrow = 'text-[10px] font-semibold uppercase tracking-widest text-slate-400';
const card = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm';

/**
 * COMPANY-WIDE AND DRIVE-WIDE STUDENT SEARCH (additional requirement 4).
 *
 * Answers the questions a placement team asks every week and could not ask before:
 * who applied to Infosys, who was rejected in that drive, who is sitting in a round
 * right now, who holds an offer from Capgemini.
 *
 * THE COMPANY DROPDOWN IS BUILT FROM THE DATA, with counts. Every drive on this platform
 * carries a free-text company name rather than a catalog link, so two spellings of one
 * employer are two entries — showing the counts makes that visible instead of letting it
 * silently split a funnel.
 *
 * TWO NUMBERS, NEVER ONE. A student in three drives is three applications and one
 * student, and a placement team asks both in the same breath.
 */
export function ApplicationSearchScreen({ basePath = '/admin' }: { basePath?: string }) {
  const [companies, setCompanies] = useState<CompanyFacet[]>([]);
  const [drives, setDrives] = useState<DriveFacet[]>([]);
  const [views, setViews] = useState<SavedApplicationView[]>([]);
  const [filters, setFilters] = useState<ApplicationSearchFilters>({ pageSize: 50, page: 0 });
  const [result, setResult] = useState<ApplicationSearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [term, setTerm] = useState('');
  const [more, setMore] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [c, o] = await Promise.all([
          getApplicationCompanies(),
          getApplicationSearchOptions(),
        ]);
        setCompanies(c);
        setViews(o.views);
      } catch (e) {
        setErr(describeError(e, 'Could not load the filters.'));
      }
    })();
  }, []);

  // Choosing a company narrows the drive list, so the second dropdown can only offer
  // drives that belong to the first choice.
  useEffect(() => {
    void (async () => {
      try {
        setDrives(await getApplicationDrives(filters.companyName));
      } catch {
        setDrives([]);
      }
    })();
  }, [filters.companyName]);

  const run = useCallback(async (f: ApplicationSearchFilters) => {
    setLoading(true);
    setErr(null);
    try {
      setResult(await searchApplications(f));
    } catch (e) {
      setErr(describeError(e, 'Could not run that search.'));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void run(filters);
  }, [filters, run]);

  // Debounced, so typing a name does not fire a query per keystroke.
  useEffect(() => {
    const t = setTimeout(
      () => setFilters((f) => ({ ...f, search: term || undefined, page: 0 })),
      350,
    );
    return () => clearTimeout(t);
  }, [term]);

  const set = (patch: Partial<ApplicationSearchFilters>) =>
    setFilters((f) => ({ ...f, ...patch, page: 0 }));

  async function doExport() {
    setExporting(true);
    try {
      const file = await exportApplications(filters);
      saveBlob(file.blob, file.filename ?? 'applications.csv');
      toast.success('Exported exactly what is on screen');
    } catch (e) {
      toast.error(describeError(e, 'Could not export.'));
    } finally {
      setExporting(false);
    }
  }

  const pages = result ? Math.ceil(result.total / (result.pageSize || 50)) : 0;
  const activeView = filters.view;

  const stageOptions = useMemo(
    () => (Object.keys(STAGE_LABELS) as Array<keyof typeof STAGE_LABELS>).map((s) => s),
    [],
  );

  return (
    <div className="space-y-5">
      {err ? (
        <div role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {err}
        </div>
      ) : null}

      {/* saved views */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => set({ view: undefined })}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            !activeView ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Everyone
        </button>
        {views.map((v) => (
          <button
            key={v.key}
            type="button"
            title={v.description}
            onClick={() => set({ view: activeView === v.key ? undefined : v.key })}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              activeView === v.key
                ? 'bg-navy text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className={card}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="f-company" className={eyebrow}>Company</label>
            <select
              id="f-company"
              value={filters.companyName ?? ''}
              onChange={(e) => set({ companyName: e.target.value || undefined, driveId: undefined })}
              className={`mt-1 w-full ${inputCls}`}
            >
              <option value="">Any company</option>
              {companies.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.applications})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-drive" className={eyebrow}>Job drive</label>
            <select
              id="f-drive"
              value={filters.driveId ?? ''}
              onChange={(e) => set({ driveId: e.target.value || undefined })}
              className={`mt-1 w-full ${inputCls}`}
            >
              <option value="">Any drive</option>
              {drives.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.applications})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-stage" className={eyebrow}>Stage</label>
            <select
              id="f-stage"
              value={filters.stages?.[0] ?? ''}
              onChange={(e) => set({ stages: e.target.value ? [e.target.value] : undefined })}
              className={`mt-1 w-full ${inputCls}`}
            >
              <option value="">Any stage</option>
              {stageOptions.map((s) => (
                <option key={s} value={s}>{STAGE_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-source" className={eyebrow}>How they applied</label>
            <select
              id="f-source"
              value={filters.source ?? ''}
              onChange={(e) => set({ source: e.target.value || undefined })}
              className={`mt-1 w-full ${inputCls}`}
            >
              <option value="">Any route</option>
              {Object.entries(APPLICATION_SOURCE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        {more ? (
          <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="f-college" className={eyebrow}>College</label>
              <input id="f-college" value={filters.collegeId ?? ''}
                onChange={(e) => set({ collegeId: e.target.value || undefined })}
                placeholder="College id" className={`mt-1 w-full ${inputCls}`} />
            </div>
            <div>
              <label htmlFor="f-batch" className={eyebrow}>Batch</label>
              <input id="f-batch" value={filters.cohort ?? ''}
                onChange={(e) => set({ cohort: e.target.value || undefined })}
                placeholder="e.g. Batch of 2027" className={`mt-1 w-full ${inputCls}`} />
            </div>
            <div>
              <label htmlFor="f-branch" className={eyebrow}>Branch</label>
              <input id="f-branch" value={filters.branch ?? ''}
                onChange={(e) => set({ branch: e.target.value || undefined })}
                placeholder="e.g. ECE" className={`mt-1 w-full ${inputCls}`} />
            </div>
            <div>
              <label htmlFor="f-course" className={eyebrow}>Course</label>
              <input id="f-course" value={filters.course ?? ''}
                onChange={(e) => set({ course: e.target.value || undefined })}
                placeholder="e.g. B.E." className={`mt-1 w-full ${inputCls}`} />
            </div>
            <div>
              <label htmlFor="f-elig" className={eyebrow}>Eligibility</label>
              <select id="f-elig" value={filters.eligibility ?? ''}
                onChange={(e) => set({ eligibility: e.target.value || undefined })}
                className={`mt-1 w-full ${inputCls}`}>
                <option value="">Any</option>
                <option value="ELIGIBLE">Eligible</option>
                <option value="INELIGIBLE">Not eligible</option>
                {/* Never judged is a different fact from judged and failed. */}
                <option value="NOT_EVALUATED">Not assessed</option>
              </select>
            </div>
            <div>
              <label htmlFor="f-placement" className={eyebrow}>Placement status</label>
              <select id="f-placement" value={filters.placementStatus ?? ''}
                onChange={(e) => set({ placementStatus: e.target.value || undefined })}
                className={`mt-1 w-full ${inputCls}`}>
                <option value="">Any</option>
                <option value="PLACED">Placed (accepted or joined)</option>
                <option value="UNPLACED">Unplaced</option>
              </select>
            </div>
            <div>
              <label htmlFor="f-offer" className={eyebrow}>Offer status</label>
              <select id="f-offer" value={filters.offerStatus ?? ''}
                onChange={(e) => set({ offerStatus: e.target.value || undefined })}
                className={`mt-1 w-full ${inputCls}`}>
                <option value="">Any</option>
                {/* OfferStatus, which is what students.placements actually stores —
                    not the pipeline's OFFER_ISSUED/OFFER_ACCEPTED. */}
                {['OFFERED','ACCEPTED','DECLINED','JOINED','DID_NOT_JOIN','RESCINDED'].map((o) => (
                  <option key={o} value={o}>{o.replace(/_/g,' ').toLowerCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-score" className={eyebrow}>Assessment score</label>
              <div className="mt-1 flex items-center gap-2">
                <input id="f-score" type="number" min={0} max={100} value={filters.minScore ?? ''}
                  onChange={(e) => set({ minScore: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="min" className={`w-full ${inputCls}`} />
                <span className="text-slate-400">–</span>
                <input type="number" min={0} max={100} value={filters.maxScore ?? ''}
                  onChange={(e) => set({ maxScore: e.target.value ? Number(e.target.value) : undefined })}
                  aria-label="Maximum assessment score"
                  placeholder="max" className={`w-full ${inputCls}`} />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="f-from" className={eyebrow}>Applied between</label>
              <div className="mt-1 flex items-center gap-2">
                <input id="f-from" type="date" value={filters.appliedFrom ?? ''}
                  onChange={(e) => set({ appliedFrom: e.target.value || undefined })}
                  className={`w-full ${inputCls}`} />
                <span className="text-slate-400">–</span>
                <input type="date" value={filters.appliedTo ?? ''}
                  aria-label="Applied before"
                  onChange={(e) => set({ appliedTo: e.target.value || undefined })}
                  className={`w-full ${inputCls}`} />
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[16rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search by name, email or phone"
              aria-label="Search students"
              className={`w-full pl-9 ${inputCls}`}
            />
          </div>
          <Button variant="ghost" onClick={() => setMore((v) => !v)}>
            {more ? 'Fewer filters' : 'More filters'}
          </Button>
          <Button variant="outline" onClick={() => void doExport()} disabled={exporting || !result?.total}>
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Export
          </Button>
        </div>
      </div>

      {/* Two counts, never one — "how many applications" and "how many students" are
          different questions and a single number makes every rate ambiguous. */}
      {result ? (
        <div className="flex flex-wrap items-center gap-6 px-1">
          <span className="inline-flex items-baseline gap-2">
            <span className="text-[26px] font-extrabold leading-none text-navy tabular-nums">
              {result.total}
            </span>
            <span className="text-sm text-slate-500">applications</span>
          </span>
          <span className="inline-flex items-baseline gap-2">
            <span className="text-[26px] font-extrabold leading-none text-navy tabular-nums">
              {result.students}
            </span>
            <span className="text-sm text-slate-500">
              <Users className="mr-1 inline size-3.5" aria-hidden />distinct students
            </span>
          </span>
        </div>
      ) : null}

      <div className={`${card} overflow-x-auto p-0`}>
        {loading ? (
          <p className="p-8 text-center text-sm text-slate-500">
            <Loader2 className="mr-2 inline size-4 animate-spin" aria-hidden />Searching…
          </p>
        ) : !result || result.rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            Nothing matches these filters.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                {['Student', 'College', 'Company', 'Drive', 'Stage', 'Route', 'Applied'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r) => (
                <tr key={r.applicationId} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={
                        basePath === '/tpo'
                          ? `/tpo/placement/students/${r.userId}`
                          : `${basePath}/placement-report/students/${r.userId}`
                      }
                      className="font-semibold text-navy underline-offset-4 hover:underline"
                    >
                      {r.fullName ?? r.email}
                    </Link>
                    <span className="block text-xs text-slate-400">{r.email}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.collegeName ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{r.companyName ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{r.driveTitle}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-200">
                      {r.stageLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {APPLICATION_SOURCE_LABELS[r.source as keyof typeof APPLICATION_SOURCE_LABELS] ?? r.source}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(r.appliedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 ? (
        <div className="flex items-center justify-between px-1">
          <span className="text-sm text-slate-500">
            Page {(filters.page ?? 0) + 1} of {pages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={(filters.page ?? 0) === 0}
              onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 0) - 1 }))}
            >
              Back
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={(filters.page ?? 0) + 1 >= pages}
              onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 0) + 1 }))}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
