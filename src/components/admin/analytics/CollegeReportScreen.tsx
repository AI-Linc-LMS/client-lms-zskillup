'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { describeError } from '@/lib/api/errors';
import {
  CtcCard,
  FunnelTable,
  MilestonesCard,
  PeriodBanner,
  RateRow,
  RateValue,
  label,
} from '@/components/admin/analytics/rate';
import {
  getCollegePlacementReport,
  type CollegeReportDto,
  type RateDto,
} from '@/lib/api/jobs';

/**
 * ONE COLLEGE OR COHORT (PRD §14, level 3).
 *
 * The level a TPO lives in, and the one where the platform's own data gaps show up most
 * plainly — so this screen is built to show them rather than paper over them.
 *
 * COVERAGE IS THE FIRST QUESTION, NOT PLACEMENT. Before "how many got placed" is worth
 * asking, a TPO needs "how many of my students are even reachable" — profile complete
 * enough to be judged, and holding access at all. A placement rate computed over a cohort
 * where half the profiles are empty is a measurement of the data, not of the students.
 *
 * PAID ACCESS IS THREE NUMBERS. A college that bought access for its cohort is not the
 * same commercial fact as a cohort that paid individually, and collapsing them into one
 * "paid" figure loses the distinction that matters to whoever is renewing.
 */
export function CollegeReportScreen({
  collegeId,
  cohort,
  department,
}: {
  collegeId: string;
  cohort?: string;
  department?: string;
}) {
  const [data, setData] = useState<CollegeReportDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getCollegePlacementReport(collegeId, { cohort, department }));
    } catch (e) {
      setError(describeError(e, 'Could not load this college’s report.'));
    } finally {
      setLoading(false);
    }
  }, [collegeId, cohort, department]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <p className="flex items-center gap-2 py-10 text-sm text-slate-500">
        <Loader2 className="size-5 animate-spin text-slate-300" aria-hidden /> Loading the
        report…
      </p>
    );
  }
  if (error) {
    return (
      <p
        role="alert"
        className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200"
      >
        {error}
      </p>
    );
  }
  if (!data) return null;

  const period = data.funnel.period;

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className={label}>College report</p>
        <h2 className="mt-1 text-lg font-bold text-navy">{data.college.name}</h2>
        <p className="text-sm text-slate-500">
          {[data.college.city, data.college.state].filter(Boolean).join(', ') || 'Location not recorded'}
          {data.cohort ? ` · cohort filter applied` : ''}
          {data.department ? ` · ${data.department}` : ''}
        </p>
        <p className="mt-3 text-[26px] font-extrabold leading-none text-navy tabular-nums">
          {data.students.toLocaleString('en-IN')}
          <span className="ml-2 align-middle text-sm font-semibold text-slate-500">
            students in scope
          </span>
        </p>
      </div>

      <PeriodBanner period={period} scope={`${data.students.toLocaleString('en-IN')} students`} />

      {/* COVERAGE BEFORE OUTCOMES — see the note at the top of this file. */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className={label}>Can we even see them?</p>
        <p className="mt-0.5 text-base font-bold text-navy">Coverage</p>
        <dl className="mt-3 space-y-2">
          <RateRow k="Profile complete enough to judge" rate={data.profileCompleteness} />
          <RateRow k="Have applied to at least one drive" rate={data.applicationCoverage} />
          <RateRow k="Hold any live access" rate={data.paidAccess.anyAccess} />
          <RateRow k="Paid cash themselves" rate={data.paidAccess.cashPaid} />
        </dl>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-200">
            {data.paidAccess.collegeSponsored} college-sponsored
          </span>
          <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
            {data.paidAccess.complimentary} complimentary
          </span>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-400">
          &ldquo;Complete enough to judge&rdquo; means a phone to reach them and a department
          to place them — not every optional field, which would report a cohort as incomplete
          for skipping a nice-to-have.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MilestonesCard
          milestones={{
            offersReceived: data.placement.offersReceived,
            accepted: data.placement.accepted,
            joined: data.placement.joined,
          }}
          caption="Measured against students in scope. Received is widest, joined narrowest — a college report that quotes one as “placements” without saying which is how a rate gets inflated."
        />
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className={label}>Who is still open</p>
          <dl className="mt-2 space-y-2">
            <RateRow k="Placed students" rate={data.placement.placedStudents} />
          </dl>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
              <p className={label}>Unplaced</p>
              <p className="mt-0.5 text-lg font-extrabold text-navy tabular-nums">
                {data.placement.unplaced.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
              <p className={label}>Not seeking</p>
              <p className="mt-0.5 text-lg font-extrabold text-navy tabular-nums">
                {data.placement.notSeeking.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">
            &ldquo;Not seeking&rdquo; is a declaration — higher studies, family business,
            anything. Counting those students as unplaced would make a cohort look worse than
            it is and tell a student they failed at something they opted out of.
          </p>
        </div>
      </div>

      <FunnelTable funnel={data.funnel} />

      <CtcCard ctc={data.ctc} />

      <div className="grid gap-4 lg:grid-cols-3">
        <GroupBreakdown title="By department" rows={data.byDepartment} />
        <GroupBreakdown title="By cohort" rows={data.byCohort} />
        <GroupBreakdown title="By passout year" rows={data.byPassoutYear} />
      </div>
    </section>
  );
}

/**
 * A group breakdown with its denominators visible.
 *
 * Every share is a share of the students in scope, so the groups add to the whole and a
 * reader can tell a small department from a struggling one — the distinction a bare
 * percentage per group destroys.
 */
function GroupBreakdown({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ group: string; students: number; share: RateDto }>;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <p className={label}>{title}</p>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-4 text-sm text-slate-500">Nothing recorded.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.slice(0, 12).map((r) => (
            <li key={r.group} className="flex items-center justify-between gap-3 px-5 py-2.5">
              <span className="min-w-0 truncate text-sm text-slate-700" title={r.group}>
                {r.group}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-sm font-semibold text-navy tabular-nums">
                  {r.students.toLocaleString('en-IN')}
                </span>
                <RateValue rate={r.share} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
