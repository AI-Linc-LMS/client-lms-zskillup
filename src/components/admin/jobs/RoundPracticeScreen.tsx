'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { describeError } from '@/lib/api/errors';
import { label } from '@/components/admin/analytics/rate';
import {
  getRoundPractice,
  recordPracticeDecision,
  type RoundPracticeDto,
} from '@/lib/api/jobs';
import {
  DECISION_LABELS,
  DECISION_REASON_REQUIRED,
  DECISIONS_AFFECTING_HIRING,
  PracticeDecision,
  PracticeRecommendation,
  RECOMMENDATION_LABELS,
  checkDecision,
} from '@/shared/practice-decision';

const REC_TONE: Record<string, string> = {
  [PracticeRecommendation.READY]: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  [PracticeRecommendation.BORDERLINE]: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  [PracticeRecommendation.PRACTICE_RECOMMENDED]: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  [PracticeRecommendation.NOT_ENOUGH_DATA]: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200',
  [PracticeRecommendation.MANUAL_REVIEW]: 'bg-red-50 text-red-700 ring-1 ring-red-200',
};

/**
 * ONE ROUND'S PRACTICE, AND WHAT PEOPLE DECIDED ABOUT IT (PRD §23.5).
 *
 * THE RECOMMENDATION IS A SUGGESTION AND THE DECISION IS A PERSON'S. The screen never
 * pre-selects a decision from the recommendation, because a default that matches the
 * machine's view is not a human decision — it is the machine's decision with a signature
 * on it. Divergence is shown, never prevented: §23.5 asks for the override to be visible,
 * which means somebody chose, not that somebody erred.
 *
 * "NOT ENOUGH DATA" IS NOT A LOW SCORE. An unmeasured candidate is rendered in slate and
 * worded as an absence. On this platform that is the common case rather than the edge one,
 * and colouring it like a failure would quietly turn missing data into a rejection.
 *
 * RECORDING A DECISION DOES NOT MOVE ANYONE. Four of the six decisions are practice-side
 * only — a candidate held for coaching is exactly where they were in the employer's
 * process. For the two that do change their position, the server says a stage move is
 * still owed and this screen passes that on, so the move happens through §10's pipeline
 * where it is validated, recorded and notified.
 */
export function RoundPracticeScreen({
  driveId,
  roundId,
}: {
  driveId: string;
  roundId: string;
}) {
  const [data, setData] = useState<RoundPracticeDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [choice, setChoice] = useState<PracticeDecision | ''>('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getRoundPractice(driveId, roundId));
    } catch (e) {
      setError(describeError(e, 'Could not load this round’s practice.'));
    } finally {
      setLoading(false);
    }
  }, [driveId, roundId]);

  useEffect(() => {
    void load();
  }, [load]);

  // `hasResult` is what lets the shared rule catch "retake something they never sat".
  // Read from the row being decided, not from the page, so it is about this candidate.
  const openRow = data?.rows.find((r) => r.userId === open) ?? null;
  const problem =
    choice === '' || !openRow
      ? null
      : checkDecision({
          decision: choice as PracticeDecision,
          reason: reason.trim() || null,
          hasResult: openRow.attempts > 0 || openRow.score !== null || openRow.startedAt !== null,
        });

  const save = async () => {
    if (!open || choice === '' || problem) return;
    setSaving(true);
    try {
      const res = await recordPracticeDecision(driveId, roundId, open, {
        decision: choice as PracticeDecision,
        reason: reason.trim() || null,
      });
      if (res.stageMoveRequired) {
        // Said out loud rather than done quietly: the move belongs to §10's pipeline.
        toast.warning(
          `Decision recorded. This one changes their position with the employer — move them to ${
            res.suggestedStage ?? 'the matching stage'
          } on the Applicants tab so the change is validated, recorded and emailed.`,
          { duration: 12000 },
        );
      } else {
        toast.success(`Recorded: ${DECISION_LABELS[choice as PracticeDecision]}.`);
      }
      setOpen(null);
      setChoice('');
      setReason('');
      await load();
    } catch (e) {
      toast.error(describeError(e, 'Could not record the decision.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <p className="flex items-center gap-2 py-10 text-sm text-slate-500">
        <Loader2 className="size-5 animate-spin text-slate-300" aria-hidden /> Loading practice…
      </p>
    );
  }
  if (error) {
    return (
      <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
        {error}
      </p>
    );
  }
  if (!data) return null;

  const s = data.summary;

  return (
    <section className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { k: 'Assigned', v: s.assigned, hint: 'Invited into this round' },
          { k: 'Submitted', v: s.submitted, hint: 'Finished the practice' },
          { k: 'Not started', v: s.notStarted, hint: 'Assigned, never opened' },
          { k: 'Decided', v: s.decided, hint: 'A person has ruled' },
          { k: 'Awaiting', v: s.awaitingDecision, hint: 'Still needs a human' },
          { k: 'Overridden', v: s.divergent, hint: 'Decision ≠ suggestion' },
        ].map((c) => (
          <div key={c.k} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className={label}>{c.k}</p>
            <p className="mt-1 text-[22px] font-extrabold leading-none text-navy tabular-nums">
              {c.v.toLocaleString('en-IN')}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-slate-500">{c.hint}</p>
          </div>
        ))}
      </div>

      {!data.round.autoScored ? (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            This round is <span className="font-semibold">not automatically scored</span>, so
            there is no score to recommend from and every row needs a human to look. That is
            the correct outcome for an interview or a group discussion — not a configuration
            fault.
          </span>
        </p>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs leading-relaxed text-slate-500 shadow-sm">
          Ready at <span className="font-semibold text-navy">{data.thresholds.readyAt}%</span>,
          borderline at <span className="font-semibold text-navy">{data.thresholds.borderlineAt}%</span>.
          The recommendation is a suggestion from those two numbers — the decision underneath
          it is a person&rsquo;s, and nothing here pre-selects one.
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className={label}>Candidates</p>
          <p className="mt-0.5 text-base font-bold text-navy">Assigned, scored, decided</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Everyone assigned appears, including those who never started — listing attempts
            instead would make exactly those people invisible.
          </p>
        </div>
        {data.rows.length === 0 ? (
          <p className="px-5 py-5 text-sm text-slate-500">Nobody has been assigned to this round yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.rows.map((r) => (
              <li key={r.userId} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-navy">{r.name ?? r.userId}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {r.score === null ? (
                        <span className="text-slate-400">no score recorded</span>
                      ) : (
                        <span className="font-semibold text-navy tabular-nums">{r.score}%</span>
                      )}
                      {r.attempts > 0 ? ` · ${r.attempts} attempt${r.attempts === 1 ? '' : 's'}` : ''}
                      {r.abandoned ? ' · started and not submitted' : ''}
                      {!r.startedAt ? ' · never started' : ''}
                    </p>
                    {/* Components are never collapsed into the total: a candidate strong on
                        aptitude and weak on coding is a different person from one evenly
                        mediocre, and the total cannot tell them apart. */}
                    {r.components.length > 0 ? (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {r.components.map((c) => (
                          <span
                            key={c.label}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 tabular-nums"
                          >
                            {c.label} {c.score === null ? '—' : `${c.score}%`}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', REC_TONE[r.recommendation] ?? REC_TONE.NOT_ENOUGH_DATA)}>
                      {RECOMMENDATION_LABELS[r.recommendation] ?? r.recommendation}
                    </span>
                    {r.flagged ? (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-red-600">
                        <ShieldAlert className="size-3" aria-hidden /> flagged
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  {r.decision ? (
                    <>
                      <span className="rounded-full bg-navy px-2.5 py-0.5 text-[11px] font-semibold text-white">
                        {DECISION_LABELS[r.decision] ?? r.decision}
                      </span>
                      {/* Surfaced, never prevented — somebody chose, they did not err. */}
                      {r.decisionDivergesFromRecommendation ? (
                        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                          overrode the suggestion
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
                      no decision yet
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant={r.decision ? 'ghost' : 'outline'}
                    onClick={() => {
                      setOpen(open === r.userId ? null : r.userId);
                      setChoice('');
                      setReason('');
                    }}
                  >
                    {r.decision ? 'Change' : 'Decide'}
                  </Button>
                </div>
                {r.decisionReason ? (
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    <span className="font-semibold">Reason:</span> {r.decisionReason}
                  </p>
                ) : null}

                {open === r.userId ? (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <label htmlFor={`dec-${r.userId}`} className={label}>
                      Decision
                    </label>
                    <select
                      id={`dec-${r.userId}`}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
                      value={choice}
                      onChange={(e) => setChoice(e.target.value as PracticeDecision | '')}
                    >
                      <option value="">Choose…</option>
                      {Object.values(PracticeDecision).map((dv) => (
                        <option key={dv} value={dv}>
                          {DECISION_LABELS[dv]}
                        </option>
                      ))}
                    </select>

                    {choice && DECISIONS_AFFECTING_HIRING.includes(choice as PracticeDecision) ? (
                      <p className="mt-2 rounded-lg bg-sky-50 p-3 text-xs leading-relaxed text-sky-900 ring-1 ring-sky-200">
                        This decision changes where the candidate stands with the employer.
                        Recording it here does <span className="font-semibold">not</span> move
                        them — do that on the Applicants tab, so the move is validated,
                        written to their history and emailed.
                      </p>
                    ) : choice ? (
                      <p className="mt-2 text-xs leading-relaxed text-slate-500">
                        Practice-side only. The candidate stays exactly where they are in the
                        employer&rsquo;s process.
                      </p>
                    ) : null}

                    {choice && DECISION_REASON_REQUIRED.includes(choice as PracticeDecision) ? (
                      <>
                        <label htmlFor={`rsn-${r.userId}`} className={cn(label, 'mt-3 block')}>
                          Reason — the candidate will be told this decision
                        </label>
                        <textarea
                          id={`rsn-${r.userId}`}
                          rows={3}
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="What would you want them to hear in six weeks?"
                        />
                      </>
                    ) : null}

                    {problem ? (
                      <p role="alert" className="mt-2 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
                        {problem.message}
                      </p>
                    ) : null}

                    <div className="mt-3 flex items-center gap-2">
                      <Button size="sm" onClick={() => void save()} disabled={saving || !choice || !!problem}>
                        {saving ? <Loader2 className="size-3.5 animate-spin" /> : null} Record
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setOpen(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
