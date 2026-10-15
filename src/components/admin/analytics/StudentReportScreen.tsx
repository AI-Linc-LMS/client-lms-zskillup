'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Repeat } from 'lucide-react';
import { describeError } from '@/lib/api/errors';
import { PeriodBanner, RateValue, label, rupees } from '@/components/admin/analytics/rate';
import { getStudentPlacementReport, type StudentReportDto } from '@/lib/api/jobs';
import { PLACEMENT_STATUS_LABELS, type PlacementStatus } from '@/shared/placement-status';
import { STAGE_LABELS, type ApplicationStage } from '@/shared/application-pipeline';

const stageLabel = (s: string) => STAGE_LABELS[s as ApplicationStage] ?? s.replace(/_/g, ' ').toLowerCase();

/** §4.11's status map, applied to a placement status rather than invented per screen. */
function statusTone(status: string): string {
  switch (status) {
    case 'JOINED':
    case 'PLACED':
    case 'PPO_INTERNSHIP':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    case 'OFFER_RECEIVED':
      return 'bg-sky-50 text-sky-700 ring-1 ring-sky-200';
    case 'IN_PROCESS':
      return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
    case 'TO_BE_REVIEWED':
      return 'bg-red-50 text-red-700 ring-1 ring-red-200';
    default:
      return 'bg-slate-50 text-slate-600 ring-1 ring-slate-200';
  }
}

/**
 * ONE STUDENT (PRD §14, level 4 — and the read surface for §7).
 *
 * Two sections of the PRD meet here. §14 asks for "applications, timeline, offers" and
 * "repeated rejection stages"; §7 defines what a placement status IS and insists the three
 * milestones stay apart and that nothing is overwritten. Both are answered from the same
 * event log, which is the whole argument for having kept one.
 *
 * THE RECURRING STOP STAGES ARE THE MOST USEFUL THING ON THE PAGE, and the only part that
 * is unanswerable from a status column. A student rejected after four interviews and a
 * student rejected before four screenings both read as "rejected" today; only history
 * separates them, and only the separation tells a TPO what to actually coach.
 *
 * DECLINED AND LAPSED OFFERS STAY VISIBLE. §7: "update offer history and placement status
 * without deleting the offer record." A declined offer is not an absence, and a student who
 * turned down two offers is not the same case as one who never had any.
 */
export function StudentReportScreen({ userId }: { userId: string }) {
  const [data, setData] = useState<StudentReportDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getStudentPlacementReport(userId));
    } catch (e) {
      setError(describeError(e, 'Could not load this student’s report.'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

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

  const status = data.placement?.status ?? null;
  const byApp = new Map<string, StudentReportDto['timeline']>();
  for (const e of data.timeline) {
    byApp.set(e.application_id, [...(byApp.get(e.application_id) ?? []), e]);
  }

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={label}>Student report</p>
            <h2 className="mt-1 text-lg font-bold text-navy">Placement history</h2>
            <p className="text-sm text-slate-500">
              {data.applications.length.toLocaleString('en-IN')} application
              {data.applications.length === 1 ? '' : 's'} on record
            </p>
          </div>
          {status ? (
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusTone(status)}`}
            >
              {PLACEMENT_STATUS_LABELS[status as PlacementStatus] ?? status}
            </span>
          ) : (
            <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
              No placement record
            </span>
          )}
        </div>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className={label}>Offer → application rate</dt>
            <dd className="mt-1">
              <RateValue rate={data.conversion} />
            </dd>
          </div>
          <div>
            <dt className={label}>Best offer held</dt>
            <dd className="mt-1 text-sm font-semibold text-navy tabular-nums">
              {data.placement?.bestCtc ? rupees(data.placement.bestCtc) : <span className="text-xs font-normal text-slate-400">none</span>}
            </dd>
          </div>
          <div>
            <dt className={label}>Milestones</dt>
            <dd className="mt-1 text-sm text-slate-600 tabular-nums">
              {data.placement
                ? `${data.placement.milestones.offersReceived} received · ${data.placement.milestones.accepted} accepted · ${data.placement.milestones.joined} joined`
                : '—'}
            </dd>
          </div>
        </dl>
      </div>

      <PeriodBanner period={data.conversion.period} />

      {data.recurringStopStages.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className={label}>Where they keep stopping</p>
          <p className="mt-0.5 text-base font-bold text-navy">Recurring stop stages</p>
          <ul className="mt-3 space-y-2">
            {data.recurringStopStages.map((s) => (
              <li key={s.stage} className="flex items-center gap-3">
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-100"
                  aria-hidden
                >
                  <Repeat className="size-4" />
                </span>
                <span className="text-sm text-slate-700">
                  Stopped at <span className="font-semibold text-navy">{s.stage}</span> in{' '}
                  {s.times} application{s.times === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">
            Only answerable from history. A student rejected after four interviews and one
            rejected before four screenings both read as &ldquo;rejected&rdquo; from a status
            column — and need completely different coaching.
          </p>
        </div>
      ) : null}

      {data.placement && data.placement.offers.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <p className={label}>Offers</p>
            <p className="mt-0.5 text-base font-bold text-navy">Every offer, including the ones that ended</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              A declined or lapsed offer stays on the record rather than becoming an absence
              — a student who turned down two offers is not the same case as one who never
              had any.
            </p>
          </div>
          <ul className="divide-y divide-slate-100">
            {data.placement.offers.map((o, i) => (
              <li key={o.id ?? i} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-navy">
                    {o.companyName ?? 'Company not recorded'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {o.kind.replace(/_/g, ' ').toLowerCase()}
                    {o.offerDate
                      ? ` · ${new Date(o.offerDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                      : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-semibold text-navy tabular-nums">
                    {o.ctc ? rupees(o.ctc) : '—'}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusTone(o.status)}`}
                  >
                    {o.status.replace(/_/g, ' ').toLowerCase()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className={label}>Applications</p>
          <p className="mt-0.5 text-base font-bold text-navy">Each drive, and every move in it</p>
        </div>
        {data.applications.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">This student has not applied to anything.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.applications.map((a) => {
              const events = byApp.get(a.id) ?? [];
              return (
                <li key={a.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/jobs/${a.job_posting_id}/applicants`}
                        className="truncate text-sm font-semibold text-navy underline-offset-2 hover:underline"
                      >
                        {a.title}
                      </Link>
                      <p className="text-xs text-slate-400">
                        {a.company_name ?? 'Company not recorded'} · applied{' '}
                        {new Date(a.applied_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                      {stageLabel(a.status)}
                    </span>
                  </div>
                  {events.length > 0 ? (
                    <ol className="mt-3 space-y-2 border-l border-slate-200 pl-4">
                      {events.map((e, i) => (
                        <li key={i} className="text-xs">
                          <span className="font-semibold text-navy">
                            {e.from_stage ? `${stageLabel(e.from_stage)} → ` : ''}
                            {stageLabel(e.to_stage)}
                          </span>
                          <span className="text-slate-400">
                            {' '}
                            ·{' '}
                            {new Date(e.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                            {e.by_student ? ' · by the student' : ''}
                          </span>
                          {/* Reason and panel feedback are kept apart on purpose: one is
                              why WE moved them, the other is what the panel said, and the
                              two get quoted to different audiences. */}
                          {e.reason ? (
                            <p className="mt-0.5 text-slate-600">
                              <span className="font-semibold">Reason:</span> {e.reason}
                            </p>
                          ) : null}
                          {e.feedback ? (
                            <p className="mt-0.5 text-slate-500">
                              <span className="font-semibold">Panel feedback:</span> {e.feedback}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
