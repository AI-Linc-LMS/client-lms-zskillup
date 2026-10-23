'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';
import { describeError } from '@/lib/api/errors';
import { getTpoPlacementDashboard, getTpoPlacementDrives } from '@/lib/api/tpo';
import type { TpoDrivePipelineSummary, TpoDriveRow } from '@/shared/tpo-placement';
import { JobStatusPill } from '@/components/admin/jobs/JobStatusPill';
import { StatusPill } from '@/components/student/StatusPill';
import { stageTone } from '@/lib/ui-maps';
import type { JobStatus } from '@/shared/enums';

const eyebrow = 'text-[10px] font-semibold uppercase tracking-widest text-slate-400';
const card = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm';

/** A rate that says "no data" rather than 0% when there is nothing to divide. */
function Rate({ label, r }: { label: string; r: { count: number; of: number; pct: number | null } }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className={eyebrow}>{label}</p>
      <p className="mt-1 text-[26px] font-extrabold leading-none text-navy tabular-nums">
        {r.pct === null ? '—' : `${r.pct}%`}
      </p>
      {/* The denominator is never dropped: 68% of seventeen is a different claim from
          68% of nine hundred, and the percentage alone cannot say which. */}
      <p className="mt-1 text-xs text-slate-500">
        {r.pct === null ? 'No data yet' : `${r.count} of ${r.of} students`}
      </p>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className={eyebrow}>{label}</p>
      <p className="mt-1 text-[26px] font-extrabold leading-none text-navy tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

/**
 * THE TPO'S PLACEMENT DASHBOARD (additional requirement 1).
 *
 * Everything here is this college's own students, including on a drive shared with four
 * other colleges — the server pins it to the token's college and the numbers are counted
 * that way, so a rival cohort's size and progress never appear.
 *
 * THERE IS DELIBERATELY NO SINGLE "PLACEMENT RATE". Offer received, accepted and joined
 * are three different claims, and one blended number lets whoever quotes it pick the
 * flattering one without saying so.
 */
export function TpoPlacementScreen() {
  const [summary, setSummary] = useState<TpoDrivePipelineSummary | null>(null);
  const [drives, setDrives] = useState<TpoDriveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [s, d] = await Promise.all([
          getTpoPlacementDashboard(),
          getTpoPlacementDrives(),
        ]);
        setSummary(s);
        setDrives(d);
      } catch (e) {
        setErr(describeError(e, 'Could not load your placement view.'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <p className="p-8 text-center text-sm text-slate-500">
        <Loader2 className="mr-2 inline size-4 animate-spin" aria-hidden />Loading…
      </p>
    );
  }
  if (err) {
    return (
      <div role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
        {err}
      </div>
    );
  }
  if (!summary) return null;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <p className={eyebrow}>Right now</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Students" value={summary.totalStudents} hint="On the platform" />
          <Kpi label="Active drives" value={summary.activeDrives} hint="Open to your college" />
          <Kpi label="Upcoming drives" value={summary.upcomingDrives} hint="Not yet open" />
          <Kpi label="Applications" value={summary.applicationsSubmitted} hint={`${summary.studentsApplied} students`} />
        </div>
      </section>

      <section className="space-y-3">
        <p className={eyebrow}>Through the pipeline</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Kpi label="Eligible" value={summary.eligibleStudents} hint="On a live drive" />
          <Kpi label="Shortlisted" value={summary.shortlistedStudents} />
          <Kpi label="In rounds" value={summary.inRoundsStudents} />
          <Kpi label="Offers received" value={summary.offersReceived} />
          <Kpi label="Joined" value={summary.joined} />
        </div>
      </section>

      <section className="space-y-3">
        <p className={eyebrow}>Three milestones, not one</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Rate label="Offer received" r={summary.placementRate.offered} />
          <Rate label="Offer accepted" r={summary.placementRate.accepted} />
          <Rate label="Actually joined" r={summary.placementRate.joined} />
        </div>
      </section>

      <section className="space-y-3">
        <p className={eyebrow}>Your drives</p>
        <div className={`${card} overflow-x-auto p-0`}>
          {drives.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">
              No drives are open to your college yet.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  {['Drive', 'Company', 'Status', 'Closes', 'Eligible', 'Applied', 'Shortlisted', 'In rounds', 'Selected', 'Offers', 'Joined', 'Furthest', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {drives.map((d) => (
                  <tr key={d.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-navy">{d.title}</span>
                      {d.scope === 'ATTEMPTED' ? (
                        <span
                          className="ml-2 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200"
                          title="Not targeted at your college — your students applied to it anyway"
                        >
                          Not yours
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{d.companyName ?? '—'}</td>
                    <td className="px-4 py-3">
                      {/* The shared pill, not a copy of it: it carries the lifecycle
                          labels and a colour per state, so Closed and Published stop
                          looking identical. The cast is the honest bridge - the column is
                          varchar and the pill already falls back on an unknown value. */}
                      <JobStatusPill status={d.status as JobStatus} />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {d.applyBy ? new Date(d.applyBy).toLocaleDateString() : '—'}
                    </td>
                    {/* 0 of 0 evaluated is "not assessed yet". 0 of 40 is "nobody
                        qualifies". Printing a bare 0 for both says the wrong one. */}
                    <td className="px-4 py-3 tabular-nums text-slate-700">
                      {d.evaluated === 0 ? (
                        <span className="text-xs text-slate-400">Not assessed</span>
                      ) : (
                        d.eligible
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">{d.applied}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">{d.shortlisted}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">{d.inRounds}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">{d.selected}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">{d.offers}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">{d.joined}</td>
                    {/* How far this drive has got FOR US, by pipeline order. One
                        informational colour is right here, and is not the bug fixed
                        above: STAGE_PROGRESS excludes the terminal negatives, so this
                        can only ever name a forward stage. */}
                    <td className="px-4 py-3">
                      {d.currentRound ? (
                        <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-200">
                          {d.currentRound}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/tpo/placement/drives/${d.id}`}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-navy underline-offset-4 hover:underline"
                      >
                        Open <ArrowRight className="size-3.5" aria-hidden />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-xs text-slate-500">
          Every number counts your own students only, even on a drive shared with other
          colleges. A drive marked &ldquo;not yours&rdquo; was not aimed at your college,
          but your students applied to it, so it is counted above.
        </p>
      </section>

      {summary.recentActivity.length > 0 ? (
        <section className="space-y-3">
          <p className={eyebrow}>Recent activity</p>
          <ul className={`${card} divide-y divide-slate-100 p-0`}>
            {summary.recentActivity.map((a, i) => (
              <li key={`${a.at}-${i}`} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="min-w-0 text-sm">
                  <span className="font-semibold text-navy">{a.studentName ?? 'A student'}</span>
                  <span className="text-slate-600"> · {a.driveTitle}</span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <StatusPill tone={stageTone(a.stage)} label={a.stageLabel} />
                  <span className="text-xs text-slate-400">
                    {new Date(a.at).toLocaleDateString()}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
