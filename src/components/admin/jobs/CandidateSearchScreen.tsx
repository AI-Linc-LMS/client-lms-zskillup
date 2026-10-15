'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, Loader2, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';
import { describeError } from '@/lib/api/errors';
import {
  bulkCandidateAction,
  getCandidateSearchOptions,
  searchCandidates,
  type CandidateSearchOptions,
  type CandidateSearchPage,
  type SearchedCandidate,
} from '@/lib/api/jobs';
import { branchShort } from '@/lib/branch';
import { BULK_REASON_REQUIRED, BulkAction, CandidateSortKey } from '@/shared/candidate-search';

const label = 'text-[10px] font-semibold uppercase tracking-widest text-slate-400';

/**
 * SEARCHING AND ACTING ON A DRIVE'S CANDIDATES (PRD §15).
 *
 * The screen the placement team actually works in, and three of its decisions are the
 * server's rules made visible rather than UI preferences.
 *
 *   AN UNSCORED CANDIDATE IS NEVER A ZERO. A blank score renders as "not enough data" in
 *   slate, never as 0 — and the sort puts those rows LAST whichever way the column points,
 *   because on this platform most scores are null and ranking them as the weakest students
 *   would be the platform's most consequential lie.
 *
 *   THE SELECTION COUNT IS SENT WITH EVERY BULK ACTION. The server refuses the request if
 *   the resolved set no longer matches, so a list that changed under the operator cannot
 *   be acted on by mistake. The dialog states the number out loud for the same reason.
 *
 *   A BULK RESULT NAMES WHO WAS SKIPPED. "38 of 41 updated" tells somebody three people
 *   need chasing without saying which three, so nobody chases them.
 */
export function CandidateSearchScreen({ driveId }: { driveId: string }) {
  const [options, setOptions] = useState<CandidateSearchOptions | null>(null);
  const [page, setPage] = useState<CandidateSearchPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<string>(CandidateSortKey.OVERALL_SCORE);
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof bulkCandidateAction>> | null>(null);

  useEffect(() => {
    let alive = true;
    getCandidateSearchOptions(driveId)
      .then((o) => alive && setOptions(o))
      .catch(() => {
        /* The list still works without the control metadata; it just loses the chips. */
      });
    return () => {
      alive = false;
    };
  }, [driveId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await searchCandidates(driveId, {
        view,
        search: search.trim() || undefined,
        sort,
        dir,
        limit,
        offset,
      });
      setPage(next);
    } catch (e) {
      setError(describeError(e, 'Could not load the candidate list.'));
    } finally {
      setLoading(false);
    }
  }, [driveId, view, search, sort, dir, offset]);

  useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  // A changed filter invalidates a selection made against the old list — keeping it would
  // be the exact stale-selection problem the server's count check exists to catch.
  useEffect(() => {
    setSelected(new Set());
    setOffset(0);
  }, [view, search, sort, dir]);

  const rows = page?.items ?? [];
  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.userId));

  const toggle = (userId: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });

  const needsReason = useMemo(
    () => (pendingAction ? BULK_REASON_REQUIRED.includes(pendingAction as BulkAction) : false),
    [pendingAction],
  );

  const runAction = async () => {
    if (!pendingAction) return;
    setBusy(true);
    try {
      const out = await bulkCandidateAction(driveId, {
        action: pendingAction,
        candidateIds: [...selected],
        reason: reason.trim() || null,
        // THE GUARD: the server refuses if the resolved set no longer matches.
        expectedCount: selected.size,
      });
      setResult(out);
      setPendingAction(null);
      setReason('');
      setSelected(new Set());
      await load();
    } catch (e) {
      setError(describeError(e, 'That action could not be completed.'));
      setPendingAction(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className={label}>Candidate search</p>
        <h2 className="mt-1 text-lg font-bold text-navy">Find and act on this drive&rsquo;s candidates</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Saved views answer the questions a placement team asks every week. A blank score
          means nobody has measured that student &mdash; it is not a low one, and those rows
          sort last whichever way you point the column.
        </p>
      </div>

      {options ? (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Saved views">
          <button
            type="button"
            onClick={() => setView(null)}
            aria-pressed={view === null}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
              view === null ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            )}
          >
            Everyone
          </button>
          {options.views.map((v) => {
            // `page?.` guarded the page and not the field, so a payload without
            // viewCounts threw and took the screen down. A missing count is a missing
            // number, not a reason to lose the search.
            const count = page?.viewCounts?.find((c) => c.view === v.key)?.count;
            return (
              <button
                key={v.key}
                type="button"
                onClick={() => setView(v.key)}
                aria-pressed={view === v.key}
                title={v.description}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                  view === v.key ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                {v.label}
                {count !== undefined ? (
                  <span className="ml-1.5 tabular-nums opacity-70">{count}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <span className="sr-only">Search candidates</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email, college, branch"
            className="h-10 w-72 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <span className={label}>Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
          >
            {(options?.sorts ?? []).map((s) => (
              // A sort the platform cannot support is shown and DISABLED with its reason,
              // rather than hidden — §15 asks for academic marks and the platform holds
              // none, and a missing control is a question nobody can answer.
              <option key={s.key} value={s.key} disabled={!!s.unavailableReason} title={s.unavailableReason ?? undefined}>
                {s.label}
                {s.unavailableReason ? ' — not available' : ''}
              </option>
            ))}
          </select>
        </label>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
        >
          {dir === 'desc' ? 'Highest first' : 'Lowest first'}
        </Button>

        <p className="ml-auto text-sm text-slate-500 tabular-nums">
          {page ? `${page.total.toLocaleString('en-IN')} matching` : null}
        </p>
      </div>

      {error ? (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      ) : null}

      {selected.size > 0 && options ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-orange/25 bg-gradient-to-r from-orange/5 to-amber-50/60 px-5 py-4 shadow-sm">
          <Users className="size-4 text-orange" aria-hidden />
          <p className="text-sm font-semibold text-navy tabular-nums">
            {selected.size} selected
          </p>
          <div className="flex flex-wrap gap-2">
            {options.bulkActions.map((a) => (
              <Button
                key={a.key}
                variant={a.key === BulkAction.REJECT ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setPendingAction(a.key)}
              >
                {a.label}
              </Button>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      ) : null}

      {result ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className={label}>Result</p>
          <p className="mt-1 text-sm text-slate-700">
            <span className="font-semibold text-navy tabular-nums">{result.appliedCount}</span>{' '}
            updated
            {result.skippedCount > 0 ? (
              <>
                {' · '}
                <span className="font-semibold text-amber-700 tabular-nums">
                  {result.skippedCount}
                </span>{' '}
                skipped
              </>
            ) : null}
          </p>
          {result.capacityWarning ? (
            <p className="mt-2 text-sm text-amber-800">{result.capacityWarning}</p>
          ) : null}
          {result.skipped.length > 0 ? (
            // NAMED, never counted: "3 skipped" tells nobody who to chase.
            <ul className="mt-3 space-y-1 text-sm text-slate-600">
              {result.skipped.map((s) => (
                <li key={s.candidateId}>
                  <span className="font-medium text-navy">{s.name ?? s.candidateId}</span> &mdash;{' '}
                  {s.reason}
                </li>
              ))}
            </ul>
          ) : null}
          <Button variant="ghost" size="sm" className="mt-3" onClick={() => setResult(null)}>
            Dismiss
          </Button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left">
            <thead>
              <tr className="border-b border-slate-200">
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Select</span>
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={() =>
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (allOnPageSelected) rows.forEach((r) => next.delete(r.userId));
                        else rows.forEach((r) => next.add(r.userId));
                        return next;
                      })
                    }
                    aria-label="Select everyone on this page"
                    className="size-4 rounded border-slate-300 text-orange focus-visible:ring-2 focus-visible:ring-orange/40"
                  />
                </th>
                {['Candidate', 'College', 'Eligibility', 'Match', 'Application', 'Placement', 'Best offer'].map(
                  (h) => (
                    <th key={h} scope="col" className={cn('px-4 py-3', label)}>
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                    <Loader2 className="mx-auto size-5 animate-spin text-slate-300" aria-hidden />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                    Nobody matches this view.
                  </td>
                </tr>
              ) : (
                rows.map((r) => <Row key={r.userId} row={r} selected={selected.has(r.userId)} onToggle={() => toggle(r.userId)} />)
              )}
            </tbody>
          </table>
        </div>

        {page && page.total > limit ? (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500 tabular-nums">
              {offset + 1}&ndash;{Math.min(offset + limit, page.total)} of {page.total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!page.hasMore}
                onClick={() => setOffset(offset + limit)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={pendingAction !== null}
        eyebrow="Confirm"
        title={options?.bulkActions.find((a) => a.key === pendingAction)?.label ?? 'Act on selection'}
        confirmLabel="Confirm"
        tone={pendingAction === BulkAction.REJECT ? 'destructive' : 'default'}
        busy={busy}
        busyLabel="Working"
        confirmDisabled={needsReason && !reason.trim()}
        onConfirm={runAction}
        onClose={() => {
          setPendingAction(null);
          setReason('');
        }}
      >
        <p>
          This will affect{' '}
          {/* Stated out loud: the server refuses the request if the list has changed since
              you selected it, and the number is what it checks against. */}
          <span className="font-semibold text-navy tabular-nums">{selected.size}</span>{' '}
          {selected.size === 1 ? 'candidate' : 'candidates'}. If the list has changed since you
          selected them, the request will be refused rather than applied to a different set.
        </p>
        {needsReason ? (
          <label className="mt-3 block">
            <span className={label}>Reason (required)</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Every candidate will be told this, and will ask about it."
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
            />
          </label>
        ) : null}
      </ConfirmDialog>
    </section>
  );
}

/** Withholding is carried per row by the server as the sentinel 'withheld', so this
 *  needs no page-level flag — one source of truth for who may see a salary. */
function Row({
  row,
  selected,
  onToggle,
}: {
  row: SearchedCandidate;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <tr className="border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50/60">
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`Select ${row.fullName ?? row.email}`}
          className="size-4 rounded border-slate-300 text-orange focus-visible:ring-2 focus-visible:ring-orange/40"
        />
      </td>
      <td className="px-4 py-3">
        <p className="text-sm font-semibold text-navy">{row.fullName ?? '—'}</p>
        <p className="text-xs text-slate-500">{row.email}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm text-slate-600">{row.collegeName ?? '—'}</p>
        <p className="text-xs text-slate-400">
          {[row.branch ? branchShort(row.branch) : null, row.cohort].filter(Boolean).join(' · ') || '—'}
        </p>
      </td>
      <td className="px-4 py-3">
        {/* THREE states, never two: "could not be judged" is not "failed" (§4). */}
        {row.needsReview ? (
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
            Needs review
          </span>
        ) : row.eligible ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
            Eligible
          </span>
        ) : (
          <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-200">
            Not eligible
          </span>
        )}
        {!row.paidAccess ? (
          <span className="ml-1.5 rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
            Cannot apply
          </span>
        ) : null}
      </td>
      <td className="px-4 py-3">
        {row.score === null ? (
          // NEVER a zero. Nobody measured this student; that is a different fact.
          <span className="text-xs text-slate-400">not enough data</span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <span className="text-sm font-semibold text-navy tabular-nums">{row.score}%</span>
            <span className="text-xs text-slate-400 tabular-nums">{row.coverage}% measured</span>
            {(row.staleWeightPct ?? 0) >= 50 ? (
              // §17: a score built on old evidence must not read like a fresh one.
              <Clock
                className="size-3.5 text-amber-600"
                aria-label="Most of this score rests on measurements over six months old"
              />
            ) : null}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">
        {row.applicationStatus ?? <span className="text-slate-400">Not applied</span>}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">{row.placementStatus ?? '—'}</td>
      <td className="px-4 py-3 text-sm tabular-nums text-slate-600">
        {row.bestOfferCtc === 'withheld' ? (
          // §17: withheld, never zeroed — "you cannot see this" and "no offer" differ.
          <span className="text-xs text-slate-400" title="You do not have permission to view CTC">
            withheld
          </span>
        ) : row.bestOfferCtc === null ? (
          <span className="text-slate-400">—</span>
        ) : (
          `₹${(row.bestOfferCtc / 100000).toFixed(1)}L`
        )}
      </td>
    </tr>
  );
}
