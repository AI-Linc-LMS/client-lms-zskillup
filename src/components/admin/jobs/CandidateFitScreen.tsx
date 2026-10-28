'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CircleHelp, Loader2, Search, ShieldCheck, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { describeError } from '@/lib/api/errors';
import { ADMIN_JOBS_BASE, getDriveCandidates, type CandidateRow, type CandidateView , type JobsApiBase } from '@/lib/api/jobs';
import { branchShort } from '@/lib/branch';
import { EligibilityVerdict } from '@/shared/drive-eligibility';
import { DIMENSION_LABELS, MatchDimension } from '@/shared/drive-matching';

const label = 'text-[10px] font-semibold uppercase tracking-widest text-slate-400';

/** Which slice of the audience the table shows. */
type Slice = 'ALL' | 'ELIGIBLE' | 'FAILED' | 'REVIEW' | 'APPLIED' | 'UNSCORED';

const SLICES: ReadonlyArray<{ key: Slice; label: string }> = [
  { key: 'ALL', label: 'Everyone' },
  { key: 'ELIGIBLE', label: 'Eligible' },
  { key: 'FAILED', label: 'Not eligible' },
  { key: 'REVIEW', label: 'Needs review' },
  { key: 'APPLIED', label: 'Applied' },
  { key: 'UNSCORED', label: 'Not enough data' },
];

/** The dimensions shown as their own columns, in the PRD's order. */
const COLUMNS: MatchDimension[] = [
  MatchDimension.APTITUDE,
  MatchDimension.TECHNICAL,
  MatchDimension.COMMUNICATION,
  MatchDimension.RESUME,
];

function scoreTone(score: number | null): string {
  if (score === null) return 'text-slate-400';
  if (score >= 70) return 'text-emerald-700';
  if (score >= 45) return 'text-amber-700';
  return 'text-red-700';
}

/** A component cell: the number, or why there isn't one. */
function ScoreCell({ row, dimension }: { row: CandidateRow; dimension: MatchDimension }) {
  const c = row.match.components.find((x) => x.dimension === dimension);
  if (!c) {
    return <span className="text-xs text-slate-300" title="This drive gives it no weight">—</span>;
  }
  if (c.score === null) {
    // Never a zero. "Not assessed" and "scored zero" are different facts about a person
    // and the table must not render them the same.
    return (
      <span className="text-xs text-slate-400" title={`${DIMENSION_LABELS[dimension]}: not assessed`}>
        n/a
      </span>
    );
  }
  return (
    <span
      className={cn('text-sm font-semibold tabular-nums', scoreTone(c.score))}
      title={`${c.source}${c.measuredAt ? ` · ${new Date(c.measuredAt).toLocaleDateString()}` : ''} · weight ${c.weight}% · contributes ${c.contribution ?? 0}`}
    >
      {Math.round(c.score)}
    </span>
  );
}

/**
 * THE CANDIDATE-FIT VIEW (PRD §6).
 *
 * Two questions, kept apart on screen exactly as they are kept apart in the engine: may
 * this person be considered at all (hard eligibility), and among those who may, how do
 * they look (match). A student who fails a mandatory criterion is shown WITH their score,
 * not filtered out and not promoted by it — the PRD is explicit that a high score cannot
 * override a failed rule.
 *
 * The screen leads with what is NOT known, which is unusual for a dashboard and deliberate
 * here. On this platform communication and interview readiness are measured for under 1%
 * of students and academic marks do not exist, so a confident ranked list would be the
 * most misleading thing this page could show. Coverage sits beside every score, "n/a"
 * never renders as a zero, and a candidate the engine cannot judge says so.
 */
/** `base` lets the TPO console use this screen against its college-scoped
 *  controller. Defaults to the admin PMS, so every existing caller is unchanged. */
export function CandidateFitScreen({
  jobId,
  base = ADMIN_JOBS_BASE,
}: {
  jobId: string;
  base?: JobsApiBase;
}) {
  const [view, setView] = useState<CandidateView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slice, setSlice] = useState<Slice>('ALL');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setView(await getDriveCandidates(jobId, base));
    } catch (e) {
      setError(describeError(e, 'Could not build the candidate view.'));
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    const all = view?.rows ?? [];
    const q = search.trim().toLowerCase();
    return all
      .filter((r) => {
        if (slice === 'ELIGIBLE') return r.eligibility.eligible;
        if (slice === 'FAILED') return r.eligibility.verdict === EligibilityVerdict.FAIL;
        if (slice === 'REVIEW') return r.eligibility.needsReview;
        if (slice === 'APPLIED') return r.applicationStatus !== null;
        if (slice === 'UNSCORED') return r.match.score === null;
        return true;
      })
      .filter((r) =>
        q
          ? `${r.fullName ?? ''} ${r.email} ${r.collegeName ?? ''}`.toLowerCase().includes(q)
          : true,
      )
      // Scored first, best first; the unscorable sit together at the bottom rather than
      // being scattered through the list as if they were weak candidates.
      .sort((a, b) => (b.match.score ?? -1) - (a.match.score ?? -1));
  }, [view, slice, search]);

  if (loading) {
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
        {error}
      </p>
    );
  }

  const s = view?.summary;
  const weighted = Object.values(view?.weights ?? {}).reduce<number>((t, w) => t + (w ?? 0), 0);

  return (
    <div className="space-y-5">
      {/* What the engine could and could not judge, before any ranking. */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { k: 'Audience', v: s?.audience ?? 0, hint: 'Students this drive reaches' },
          { k: 'Eligible', v: s?.eligible ?? 0, hint: 'Pass every hard criterion' },
          { k: 'Applied', v: s?.applied ?? 0, hint: 'Have submitted an application' },
          { k: 'Not enough data', v: s?.insufficientData ?? 0, hint: 'Too little measured to score' },
        ].map((c) => (
          <div key={c.k} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className={label}>{c.k}</p>
            <p className="mt-1 text-[26px] font-extrabold leading-none text-navy tabular-nums">
              {c.v.toLocaleString('en-IN')}
            </p>
            <p className="mt-1 text-xs text-slate-500">{c.hint}</p>
          </div>
        ))}
      </div>

      {(s?.insufficientData ?? 0) > 0 ? (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <span className="font-semibold">
              {s!.insufficientData} of {s!.audience} candidates cannot be scored yet.
            </span>{' '}
            A score is only reported when enough of the drive&rsquo;s weighted dimensions have
            actually been measured. Blank is not a low score &mdash; it means nobody has
            measured that student.
          </span>
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter candidates">
          {SLICES.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setSlice(f.key)}
              aria-pressed={slice === f.key}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                slice === f.key
                  ? 'bg-navy text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="relative ml-auto">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email or college"
            aria-label="Search candidates"
            className="h-10 w-64 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
          />
        </label>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          Refresh
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              <th className="px-4 py-3 font-semibold">Student</th>
              <th className="px-3 py-3 font-semibold">Eligibility</th>
              {COLUMNS.map((d) => (
                <th key={d} className="px-3 py-3 text-center font-semibold">
                  {DIMENSION_LABELS[d].split(' ')[0]}
                </th>
              ))}
              <th className="px-3 py-3 text-right font-semibold">Match</th>
              <th className="px-3 py-3 text-right font-semibold">Cover</th>
              <th className="px-3 py-3 font-semibold">Access</th>
              <th className="px-3 py-3 font-semibold">Application</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.userId} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2.5">
                  <span className="block font-semibold text-navy">{r.fullName ?? '—'}</span>
                  <span className="block text-xs text-slate-500">
                    {r.email}
                    {r.collegeName ? ` · ${r.collegeName}` : ''}
                    {r.branch ? ` · ${branchShort(r.branch)}` : ''}
                  </span>
                </td>

                <td className="px-3 py-2.5">
                  {r.eligibility.verdict === EligibilityVerdict.FAIL ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-200"
                      title={r.eligibility.reasons.join(' · ')}
                    >
                      <ShieldX className="size-3" aria-hidden /> Not eligible
                    </span>
                  ) : r.eligibility.needsReview ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200"
                      title={r.eligibility.reasons.join(' · ')}
                    >
                      <CircleHelp className="size-3" aria-hidden /> Data missing
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                      <ShieldCheck className="size-3" aria-hidden /> Eligible
                    </span>
                  )}
                  {/* The reason codes the PRD asks for, not just a colour. */}
                  {r.eligibility.reasons.length > 0 ? (
                    <span className="mt-0.5 block max-w-[16rem] truncate text-xs text-slate-400">
                      {r.eligibility.reasons[0]}
                    </span>
                  ) : null}
                </td>

                {COLUMNS.map((d) => (
                  <td key={d} className="px-3 py-2.5 text-center">
                    <ScoreCell row={r} dimension={d} />
                  </td>
                ))}

                <td className="px-3 py-2.5 text-right">
                  {r.match.score === null ? (
                    <span className="text-xs text-slate-400">not enough data</span>
                  ) : (
                    <span className={cn('text-base font-extrabold tabular-nums', scoreTone(r.match.score))}>
                      {Math.round(r.match.score)}%
                    </span>
                  )}
                </td>

                {/* Coverage sits beside the score on purpose: 90% of two dimensions and
                    90% of six are different claims. */}
                <td className="px-3 py-2.5 text-right">
                  <span
                    className={cn(
                      'text-xs tabular-nums',
                      r.match.coverage >= 60 ? 'text-slate-500' : 'text-amber-700',
                    )}
                    title={`${r.match.coverage}% of this drive's weighted dimensions were measurable`}
                  >
                    {r.match.coverage}%
                  </span>
                </td>

                <td className="px-3 py-2.5">
                  {r.paidAccess ? (
                    <span className="text-xs text-emerald-700">Can apply</span>
                  ) : (
                    <span className="text-xs text-slate-400" title="No active plan — can view but not apply">
                      View only
                    </span>
                  )}
                </td>

                <td className="px-3 py-2.5">
                  {r.applicationStatus ? (
                    <span className="text-xs font-semibold text-navy">{r.applicationStatus}</span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            {view?.rows.length === 0
              ? 'This drive does not reach anybody yet — check its audience.'
              : 'Nobody in this group.'}
          </p>
        ) : null}
      </div>

      <p className="text-xs leading-relaxed text-slate-400">
        Weights total {Math.round(weighted)}%. Hover any score for its source, date, weight and
        contribution. Eligibility and match are separate: a candidate who fails a hard criterion
        is shown with their score, never promoted by it.
      </p>
    </div>
  );
}
