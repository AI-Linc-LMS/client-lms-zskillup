'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, MessageSquare, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { describeError } from '@/lib/api/errors';
import { label } from '@/components/admin/analytics/rate';
import {
  getInterviewPlan,
  saveInterviewPlan,
  suggestInterviewPlan,
  type SavedInterviewPlanDto,
} from '@/lib/api/jobs';
import { checkInterviewPlan, type InterviewPlan } from '@/shared/interview-plan';

/**
 * WHAT THIS INTERVIEW IS TESTING, AND WHAT A GOOD ANSWER SOUNDS LIKE (PRD §23.6).
 *
 * THE SUGGESTION CANNOT BE ACCEPTED BLIND, and that is the point of the screen. The
 * server's starting plan deliberately leaves `expectedEvidence` empty on every
 * competency, and the shared rule refuses to save one without it. So somebody has to
 * write down what they are actually listening for before this becomes a plan.
 *
 * That is the difference between a rubric and a list of topics. A panel given "tests
 * problem solving" scores on impression; a panel given "should reach for an index before
 * a cache, and say why" scores on evidence — and two panels given the second agree with
 * each other, which is the only way a structured interview is fairer than an unstructured
 * one.
 *
 * Weights are shown as they are entered. The shared rule checks they total 100, because
 * a rubric whose weights sum to 83 is being applied differently by every person using it.
 */
export function InterviewPlanCard({
  driveId,
  roundId,
}: {
  driveId: string;
  roundId: string;
}) {
  const [saved, setSaved] = useState<SavedInterviewPlanDto | null>(null);
  const [draft, setDraft] = useState<InterviewPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSaved(await getInterviewPlan(driveId, roundId));
    } catch {
      setSaved(null);
    } finally {
      setLoading(false);
    }
  }, [driveId, roundId]);

  useEffect(() => {
    void load();
  }, [load]);

  const suggest = async () => {
    setBusy(true);
    try {
      const p = await suggestInterviewPlan(driveId, roundId);
      setDraft(p);
      toast.info(
        'A starting point, not a plan. Every competency needs “what a good answer sounds like” before it can be saved.',
        { duration: 9000 },
      );
    } catch (e) {
      toast.error(describeError(e, 'Could not suggest a plan for this round.'));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!draft) return;
    const problem = checkInterviewPlan(draft);
    if (problem) {
      toast.error(problem.message, { duration: 9000 });
      return;
    }
    setBusy(true);
    try {
      setSaved(await saveInterviewPlan(driveId, roundId, draft));
      setDraft(null);
      toast.success('Interview plan saved.');
    } catch (e) {
      toast.error(describeError(e, 'Could not save the plan.'));
    } finally {
      setBusy(false);
    }
  };

  const setEvidence = (i: number, text: string) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            competencies: d.competencies.map((c, n) =>
              n === i
                ? { ...c, expectedEvidence: text.split('\n').map((x) => x.trim()).filter(Boolean) }
                : c,
            ),
          }
        : d,
    );

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin text-slate-300" aria-hidden /> Loading the
          interview plan…
        </p>
      </div>
    );
  }

  const plan: InterviewPlan | null = draft
    ? draft
    : saved
      ? {
          roundKind: saved.round_kind as InterviewPlan['roundKind'],
          mode: saved.mode as InterviewPlan['mode'],
          role: saved.role,
          competencies: saved.competencies ?? [],
          questions: saved.questions ?? [],
          rubric: saved.rubric,
          durationMinutes: saved.duration_minutes,
          candidateBrief: saved.candidate_brief,
        }
      : null;

  const weightTotal = (plan?.competencies ?? []).reduce((t, c) => t + (c.weight ?? 0), 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100" aria-hidden>
            <MessageSquare className="size-4" />
          </span>
          <div>
            <p className={label}>Interview plan</p>
            <p className="mt-0.5 text-base font-bold text-navy">
              What this round is testing
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {draft ? (
            <>
              <Button size="sm" onClick={() => void save()} disabled={busy}>
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : null} Save plan
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
                Discard
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => void suggest()} disabled={busy}>
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              {saved ? 'Start again' : 'Suggest a starting point'}
            </Button>
          )}
        </div>
      </div>

      {!plan ? (
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          No plan yet. A panel given &ldquo;tests problem solving&rdquo; scores on
          impression; a panel given &ldquo;should reach for an index before a cache, and say
          why&rdquo; scores on evidence — and two panels given the second agree with each
          other, which is the only thing that makes a structured interview fairer than an
          unstructured one.
        </p>
      ) : (
        <>
          {draft ? (
            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 ring-1 ring-amber-200">
              This is a <span className="font-semibold">starting point, not a plan</span>. Every
              competency below needs what a good answer sounds like before it will save —
              deliberately, so the suggestion cannot be accepted blind.
            </p>
          ) : null}

          <ul className="mt-3 space-y-3">
            {plan.competencies.map((c, i) => (
              <li key={`${c.name}-${i}`} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-navy">{c.name}</p>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 tabular-nums">
                    {c.weight ?? 0}%
                  </span>
                </div>
                {draft ? (
                  <textarea
                    rows={3}
                    aria-label={`What a good answer sounds like for ${c.name}`}
                    placeholder="One per line — what you are actually listening for."
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
                    value={(c.expectedEvidence ?? []).join('\n')}
                    onChange={(e) => setEvidence(i, e.target.value)}
                  />
                ) : (c.expectedEvidence ?? []).length > 0 ? (
                  <ul className="mt-1.5 space-y-0.5">
                    {(c.expectedEvidence ?? []).map((ev, n) => (
                      <li key={n} className="text-sm leading-relaxed text-slate-600">
                        · {ev}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">No evidence recorded.</p>
                )}
              </li>
            ))}
          </ul>

          <p className="mt-3 text-xs text-slate-400">
            Weights total{' '}
            <span className={weightTotal === 100 ? 'font-semibold text-navy' : 'font-semibold text-amber-700'}>
              {weightTotal}%
            </span>
            . A rubric whose weights sum to anything else is being applied differently by
            every person using it.
          </p>

          {plan.questions.length > 0 ? (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className={label}>Questions</p>
              <ul className="mt-1.5 space-y-1">
                {plan.questions.map((q, i) => (
                  <li key={i} className="text-sm leading-relaxed text-slate-600">
                    {q.question}
                    {q.competency ? (
                      <span className="ml-1.5 text-xs text-slate-400">({q.competency})</span>
                    ) : null}
                    {/* Follow-ups are probes an interviewer MAY use, not a decision tree —
                        a panel reading from a script stops listening to the answer. */}
                    {q.followUps.length > 0 ? (
                      <span className="mt-0.5 block text-xs text-slate-400">
                        probes: {q.followUps.join(' · ')}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
