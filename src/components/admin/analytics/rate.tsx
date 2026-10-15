'use client';

import { TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FunnelDto, RateDto } from '@/lib/api/jobs';

/** The uppercase label from the design law (§4.3) — the premium tell, used on every card. */
export const label = 'text-[10px] font-semibold uppercase tracking-widest text-slate-400';

/**
 * RENDER A RATE THE WAY §14 INSISTS IT BE READ.
 *
 * "Show denominator and time period for each rate." A bare "68%" is unreadable — 68% of
 * seventeen people last week is a different claim from 68% of nine hundred over a year,
 * and the number alone cannot distinguish them. So the denominator sits beside it always.
 *
 * AND AN EMPTY DENOMINATOR IS NOT ZERO PERCENT. `pct` is null when there is nothing to
 * divide, and this renders "no data" rather than "0%" — nobody has applied yet is not the
 * same fact as everybody failed. On a new drive or an empty cohort that distinction is the
 * difference between a quiet start and a catastrophe.
 *
 * THIS LIVES HERE, SHARED, FOR A REASON. §14 has six reporting levels and every one of
 * them renders rates. A rule enforced by a local helper in one screen is a rule that holds
 * until somebody writes the second screen; enforced by the only component that can render
 * a `RateDto`, it holds everywhere.
 */
export function RateValue({ rate, className }: { rate: RateDto | null; className?: string }) {
  if (!rate) return <span className="text-xs text-slate-300">—</span>;
  const window = describePeriod(rate.period);
  if (rate.pct === null) {
    return (
      <span
        className={cn('text-xs text-slate-400', className)}
        title={`0 ${rate.of} · ${window}`}
      >
        no data
      </span>
    );
  }
  return (
    <span
      className={cn('whitespace-nowrap', className)}
      title={`${rate.numerator.toLocaleString('en-IN')} of ${rate.denominator.toLocaleString('en-IN')} ${rate.of} · ${window}`}
    >
      <span className="text-sm font-semibold text-navy tabular-nums">{rate.pct}%</span>{' '}
      <span className="text-xs text-slate-400 tabular-nums">
        ({rate.numerator.toLocaleString('en-IN')} of {rate.denominator.toLocaleString('en-IN')})
      </span>
    </span>
  );
}

/** A period in words. Open-ended on either side is normal and says so. */
export function describePeriod(period: { from: string | null; to: string | null }): string {
  const d = (v: string) => new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  if (!period.from && !period.to) return 'all time';
  if (period.from && period.to) return `${d(period.from)} – ${d(period.to)}`;
  if (period.from) return `since ${d(period.from)}`;
  return `up to ${d(period.to as string)}`;
}

/**
 * THE WINDOW EVERY RATE ON THE PAGE IS MEASURED OVER (§14).
 *
 * §14 asks for the denominator AND the time period on every rate. The denominator belongs
 * beside the number — it changes what the number means. The period does not vary between
 * rates on one report, and stamping a date range onto forty of them would bury the figures
 * it was meant to qualify.
 *
 * So it is stated once, here, where it cannot be missed, and repeated on each rate's
 * tooltip. A reader can never see a percentage on this page without its window being one
 * glance away — which is the rule's intent, rather than its most literal reading.
 */
export function PeriodBanner({
  period,
  scope,
}: {
  period: { from: string | null; to: string | null };
  scope?: string;
}) {
  return (
    <p className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm text-slate-600 shadow-sm">
      <span className={label}>Period</span>{' '}
      <span className="font-semibold text-navy">{describePeriod(period)}</span>
      {scope ? <span className="text-slate-500"> · {scope}</span> : null}
      <span className="mt-1 block text-xs text-slate-400">
        Every rate below is measured over this window. Hover any percentage to see its own
        numerator, denominator and period.
      </span>
    </p>
  );
}

/** A rate on its own line, label left, value right — the shape every summary card uses. */
export function RateRow({ k, rate }: { k: string; rate: RateDto | null }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-sm text-slate-600">{k}</dt>
      <dd>
        <RateValue rate={rate} />
      </dd>
    </div>
  );
}

/** Lakhs, because every CTC in this market is quoted that way. */
export const rupees = (n: number | null) => (n === null ? '—' : `₹${(n / 100000).toFixed(1)}L`);

/**
 * THE FUNNEL, AS A TABLE (§14).
 *
 * Monotone by construction, because it is read from §10's event log rather than from
 * current status: a candidate interviewed and then rejected still counts as interviewed.
 * That is worth saying on screen — these are "ever reached" counts, not "currently at" —
 * because a reader who assumes otherwise will read the rejections as missing.
 *
 * `topIsApplied` exists because the company level cannot honestly produce an eligible
 * audience: a student eligible for three of a company's drives is one person, not three.
 * Rather than invent that denominator the funnel starts at APPLIED and says so.
 */
export function FunnelTable({
  funnel,
  topIsApplied = false,
}: {
  funnel: FunnelDto;
  topIsApplied?: boolean;
}) {
  const top = funnel.steps[0]?.count ?? 0;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <p className={label}>Funnel</p>
        <p className="mt-0.5 text-base font-bold text-navy">Where people are lost</p>
        {topIsApplied ? (
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            This funnel starts at <span className="font-semibold">applied</span>. One student
            eligible for three of this company&rsquo;s drives is one person, not three, so an
            eligible-audience total across drives would be a number we cannot honestly produce.
          </p>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-slate-200">
              {['Stage', 'Reached', 'Stopped here', 'From previous', 'From the top'].map((h) => (
                <th key={h} scope="col" className={cn('px-5 py-3', label)}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {funnel.steps.map((s) => (
              <tr key={s.stage} className="border-b border-slate-100 last:border-0">
                <td className="px-5 py-3">
                  <span className="text-sm font-semibold text-navy">{s.label}</span>
                  {/* A bar makes the shape readable without inventing a chart library. */}
                  <span className="mt-1 block h-1.5 w-full max-w-[160px] overflow-hidden rounded-full bg-slate-100">
                    <span
                      className="block h-full rounded-full bg-navy"
                      style={{ width: top > 0 ? `${Math.min(100, (s.count / top) * 100)}%` : '0%' }}
                    />
                  </span>
                </td>
                <td className="px-5 py-3 text-sm font-semibold text-navy tabular-nums">
                  {s.count.toLocaleString('en-IN')}
                </td>
                <td className="px-5 py-3 text-sm text-slate-600 tabular-nums">
                  {s.stoppedHere.toLocaleString('en-IN')}
                </td>
                <td className="px-5 py-3">
                  <RateValue rate={s.conversionFromPrevious} />
                </td>
                <td className="px-5 py-3">
                  <RateValue rate={s.conversionFromTop} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * THE CTC DISTRIBUTION, MEDIAN FIRST.
 *
 * The mean is present and deliberately secondary: one exceptional offer drags it above
 * anything most students will actually see, and a placement report that leads with the mean
 * is the most common way a cohort's prospects get overstated.
 */
export function CtcCard({
  ctc,
}: {
  ctc: { median: number | null; mean: number | null; lowest: number | null; highest: number | null; counted: number; bands: Array<{ label: string; count: number }> };
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className={label}>Offers</p>
      {ctc.counted === 0 ? (
        <p className="mt-2 text-sm text-slate-500">No offers recorded yet.</p>
      ) : (
        <>
          <p className="mt-1 text-[26px] font-extrabold leading-none text-navy tabular-nums">
            {rupees(ctc.median)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            median of {ctc.counted} · range {rupees(ctc.lowest)}–{rupees(ctc.highest)} · mean{' '}
            {rupees(ctc.mean)}
          </p>
          <ul className="mt-3 space-y-1.5">
            {ctc.bands
              .filter((b) => b.count > 0)
              .map((b) => (
                <li key={b.label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-600">{b.label}</span>
                  <span className="font-semibold text-navy tabular-nums">{b.count}</span>
                </li>
              ))}
          </ul>
        </>
      )}
    </div>
  );
}

/**
 * THE THREE PLACEMENT MILESTONES, KEPT APART.
 *
 * §14: "'placed' must distinguish offer received, accepted and joined ... keep all three
 * separately tracked regardless." Collapsing them into one "placed" figure is the easiest
 * way to make a placement rate look better than it is, so there is deliberately no single
 * number here to quote.
 */
export function MilestonesCard({
  milestones,
  caption,
}: {
  milestones: { offersReceived: RateDto; accepted: RateDto; joined: RateDto; offerToJoining?: RateDto };
  caption?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className={label}>Placement</p>
      <p className="mt-0.5 text-base font-bold text-navy">Three milestones, not one</p>
      <dl className="mt-3 space-y-2">
        <RateRow k="Offer received" rate={milestones.offersReceived} />
        <RateRow k="Offer accepted" rate={milestones.accepted} />
        <RateRow k="Actually joined" rate={milestones.joined} />
        {milestones.offerToJoining ? (
          <div className="border-t border-slate-100 pt-2">
            <RateRow k="Offer → joining" rate={milestones.offerToJoining} />
          </div>
        ) : null}
      </dl>
      <p className="mt-3 text-xs leading-relaxed text-slate-400">
        {caption ??
          'Received is the widest and joined the narrowest. Quoting one of them as “placements” without saying which is how a placement rate gets inflated.'}
      </p>
    </div>
  );
}

/**
 * THE BIGGEST LOSSES, AND WHAT HELPS (§14).
 *
 * "Identify stages with highest rejection/drop-off ... show recurring skill gaps and
 * recommended training interventions."
 *
 * The interventions are a fixed table on the server, mapped from the stage people are lost
 * at — not generated. That is deliberate and worth knowing when reading them: a drive
 * losing everyone at the aptitude round and one losing everyone at the HR round need
 * different answers, and a short mapping an operator can read and disagree with is more
 * use than a fluent sentence that merely sounds like analysis.
 */
export function StageLossesCard({
  losses,
  limit = 4,
  title = 'Biggest losses, and what helps',
}: {
  losses: Array<{ stage: string; label: string; lost: number; rate: RateDto; intervention: string | null }>;
  limit?: number;
  title?: string;
}) {
  if (losses.length === 0) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className={label}>Stage improvement</p>
      <p className="mt-0.5 text-base font-bold text-navy">{title}</p>
      <ul className="mt-3 space-y-3">
        {losses.slice(0, limit).map((l) => (
          <li key={l.stage} className="flex gap-3">
            <span
              className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600 ring-1 ring-red-100"
              aria-hidden
            >
              <TrendingDown className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-navy">
                {l.label} — lost {l.lost.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-slate-400">
                <RateValue rate={l.rate} />
              </p>
              {l.intervention ? (
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{l.intervention}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * REASONS STAFF ACTUALLY WROTE, verbatim.
 *
 * §10 requires a reason on every rejection precisely so this table can exist. Shown
 * unedited and ungrouped-by-theme, because the value is in the words somebody chose —
 * summarising them back into categories throws away the only thing that made them worth
 * collecting.
 */
export function RecordedReasonsCard({
  reasons,
  title = 'Reasons recorded',
}: {
  reasons: Array<{ stage: string; reason: string | null; n: number }>;
  title?: string;
}) {
  if (reasons.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <p className={label}>{title}</p>
        <p className="mt-0.5 text-base font-bold text-navy">What was written at the time</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Verbatim, and deliberately not grouped into themes — the words somebody chose are
          the only reason these were worth collecting.
        </p>
      </div>
      <ul className="divide-y divide-slate-100">
        {reasons.slice(0, 20).map((r, i) => (
          <li key={`${r.stage}-${i}`} className="flex items-start justify-between gap-4 px-5 py-3">
            <div className="min-w-0">
              <p className="text-sm leading-relaxed text-slate-700">{r.reason}</p>
              <p className="mt-0.5 text-xs text-slate-400">{r.stage}</p>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 tabular-nums">
              {r.n}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
