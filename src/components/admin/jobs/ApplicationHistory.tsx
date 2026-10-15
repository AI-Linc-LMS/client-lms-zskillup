'use client';

import { useEffect, useState } from 'react';
import { Loader2, User, UserCog } from 'lucide-react';
import { getApplicationHistory, type StageEventDto } from '@/lib/api/jobs';
import { describeError } from '@/lib/api/errors';
import { LEGACY_STATUS_MAP, STAGE_LABELS, type ApplicationStage } from '@/shared/application-pipeline';

const label = 'text-[10px] font-semibold uppercase tracking-widest text-slate-400';

/** A stored stage may still be one of the six pre-§10 values; read it through the map. */
function stageName(raw: string | null): string {
  if (!raw) return '—';
  const mapped = (LEGACY_STATUS_MAP[raw] ?? raw) as ApplicationStage;
  return STAGE_LABELS[mapped] ?? raw;
}

/**
 * ONE CANDIDATE'S FULL HISTORY (PRD §10).
 *
 * §10 writes an event per move rather than updating a column, specifically so that "who
 * rejected me, when, and why" has an answer. That only pays off if somebody can read it —
 * until now the data existed and no screen showed it.
 *
 * Oldest LAST, like every other feed here. Each row carries the reason and the panel's
 * feedback separately, because they get quoted to different audiences: the reason is why
 * WE moved them, the feedback is what the interviewer said.
 *
 * A student-initiated move (a withdrawal) is marked as such. Otherwise a withdrawal reads
 * as though the team dropped them, which is both wrong and the kind of thing that gets
 * repeated back to a college.
 */
export function ApplicationHistory({ applicationId }: { applicationId: string }) {
  const [events, setEvents] = useState<StageEventDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setEvents(null);
    setError(null);
    getApplicationHistory(applicationId)
      .then((e) => alive && setEvents(e))
      .catch((e) => alive && setError(describeError(e, 'Could not load the history.')));
    return () => {
      alive = false;
    };
  }, [applicationId]);

  if (error) {
    return (
      <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
        {error}
      </p>
    );
  }
  if (events === null) {
    return (
      <p className="flex items-center gap-2 py-4 text-sm text-slate-500">
        <Loader2 className="size-4 animate-spin text-slate-300" aria-hidden /> Loading history…
      </p>
    );
  }
  if (events.length === 0) {
    return <p className="py-3 text-sm text-slate-500">No moves recorded yet.</p>;
  }

  return (
    <div>
      <p className={label}>History</p>
      <ol className="mt-2 space-y-3">
        {events.map((e, i) => (
          <li key={`${e.createdAt}-${i}`} className="flex gap-3">
            <span
              className="mt-1 grid size-7 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-600 ring-1 ring-sky-100"
              aria-hidden
            >
              {e.byStudent ? <User className="size-3.5" /> : <UserCog className="size-3.5" />}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-navy">
                {e.fromStage ? (
                  <>
                    {stageName(e.fromStage)} <span className="text-slate-400">→</span>{' '}
                    {stageName(e.toStage)}
                  </>
                ) : (
                  <>Recorded as {stageName(e.toStage)}</>
                )}
                {e.byStudent ? (
                  <span className="ml-2 rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                    by the student
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-slate-400">
                {new Date(e.createdAt).toLocaleString('en-IN')}
                {e.roundId ? ` · round ${e.roundId}` : ''}
                {e.score !== null && e.score !== undefined ? ` · score ${e.score}` : ''}
              </p>
              {e.reason ? (
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  <span className={label}>Reason</span>{' '}
                  <span className="align-middle">{e.reason}</span>
                </p>
              ) : null}
              {/* Kept visually apart from the reason — they are quoted to different people. */}
              {e.feedback ? (
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  <span className={label}>Panel said</span>{' '}
                  <span className="align-middle">{e.feedback}</span>
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-slate-400">
        Nothing here is ever edited or removed — a later decision adds a row rather than
        replacing one.
      </p>
    </div>
  );
}
