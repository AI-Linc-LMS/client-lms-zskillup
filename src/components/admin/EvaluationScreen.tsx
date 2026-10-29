'use client';

/**
 * Marking screen for subjective answers — rendered by /admin, /superadmin AND /tpo.
 *
 * One screen behind three thin route files, for the same reason the SEO and refund
 * screens do it: `navForPath` picks the sidebar from the PATHNAME, so sending a TPO or a
 * super-admin into /admin flips their whole rail. The API applies the tenant boundary, so
 * a TPO opening this sees only their own college's papers — this component does no
 * scoping of its own and must not pretend to.
 */

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Check, Clock, Loader2, RefreshCw } from 'lucide-react';
import {
  evaluateAnswer,
  getEvaluationQueue,
  getEvaluationSheet,
  type EvaluationAnswer,
  type EvaluationQueueRow,
  type EvaluationSheet,
} from '@/lib/api/evaluation';
import { clampAwardedMarks } from '@/shared/subjective-grading';
import { Button } from '@/components/ui/button';

const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

export function EvaluationScreen() {
  const [queue, setQueue] = useState<EvaluationQueueRow[]>([]);
  const [total, setTotal] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<EvaluationSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const loadQueue = useCallback(
    () =>
      getEvaluationQueue({ limit: 100 })
        .then((r) => {
          setQueue(r.rows);
          setTotal(r.total);
        })
        .catch(() => setErr('Could not load the marking queue.')),
    [],
  );

  useEffect(() => {
    void loadQueue().finally(() => setLoading(false));
  }, [loadQueue]);

  const open = async (attemptId: string) => {
    setErr(null);
    setOpenId(attemptId);
    setSheet(null);
    try {
      setSheet(await getEvaluationSheet(attemptId));
    } catch {
      setErr('Could not open that attempt.');
      setOpenId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid place-items-center rounded-xl border border-slate-200 bg-white p-12 shadow-sm">
        <Loader2 className="size-5 animate-spin text-slate-400" aria-hidden />
      </div>
    );
  }

  if (openId && sheet) {
    return (
      <MarkingSheet
        sheet={sheet}
        onBack={() => {
          setOpenId(null);
          setSheet(null);
          void loadQueue();
        }}
        onSaved={(updated) => setSheet(updated)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Assessments
          </p>
          <h1 className="text-[28px] font-extrabold tracking-tight text-navy">
            Written answers to mark
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
            Subjective answers are not auto-graded. Until you mark them the student&apos;s
            result shows as <strong className="font-semibold text-navy">pending review</strong>,
            not as a fail — their score can only go up from what they already have.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void loadQueue()}>
          <RefreshCw /> Refresh
        </Button>
      </div>

      {err && (
        <div
          className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200"
          role="alert"
        >
          {err}
        </div>
      )}

      {queue.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
            <Check className="size-5" aria-hidden />
          </span>
          <p className="mt-3 text-base font-bold text-navy">Nothing waiting</p>
          <p className="mt-1 text-sm text-slate-600">
            Every written answer has been marked.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-500">
            {total} attempt{total === 1 ? '' : 's'} with answers awaiting a mark.
          </p>
          <ul className="space-y-3">
            {queue.map((r) => (
              <li
                key={r.attemptId}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="text-base font-bold text-navy">
                    {r.studentName ?? r.email}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {r.email} · {r.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">submitted {when(r.submittedAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                    <Clock className="size-3" aria-hidden />
                    {r.pendingCount} answer{r.pendingCount === 1 ? '' : 's'} · {r.pendingMarks} marks
                  </span>
                  <Button type="button" size="sm" onClick={() => void open(r.attemptId)}>
                    Mark
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function MarkingSheet({
  sheet,
  onBack,
  onSaved,
}: {
  sheet: EvaluationSheet;
  onBack: () => void;
  onSaved: (s: EvaluationSheet) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft /> Back to queue
        </Button>
        <h1 className="mt-2 text-[28px] font-extrabold tracking-tight text-navy">
          {sheet.student.fullName ?? sheet.student.email}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {sheet.student.email} · {sheet.title} · submitted {when(sheet.submittedAt)}
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Score so far <strong className="font-semibold text-navy">{sheet.autoScore}</strong> of{' '}
          {sheet.total}
          {sheet.pendingCount > 0 ? (
            <span className="font-semibold text-amber-700">
              {' '}
              · {sheet.pendingCount} answer{sheet.pendingCount === 1 ? '' : 's'} still unmarked
            </span>
          ) : (
            <span className="font-semibold text-emerald-700"> · all answers marked</span>
          )}
        </p>
      </div>

      <ol className="space-y-4">
        {sheet.answers.map((a, i) => (
          <AnswerCard
            key={a.answerId}
            index={i + 1}
            answer={a}
            onSaved={(updated, pendingCount, score) =>
              onSaved({
                ...sheet,
                autoScore: score,
                pendingCount,
                answers: sheet.answers.map((x) => (x.answerId === updated.answerId ? updated : x)),
              })
            }
          />
        ))}
      </ol>
    </div>
  );
}

function AnswerCard({
  index,
  answer,
  onSaved,
}: {
  index: number;
  answer: EvaluationAnswer;
  onSaved: (a: EvaluationAnswer, pendingCount: number, score: number) => void;
}) {
  // Empty string, not 0, as the initial value for an unmarked answer: pre-filling 0 makes
  // "didn't mark it" and "awarded nothing" look identical in the form.
  const [marks, setMarks] = useState<string>(
    answer.awardedMarks === null ? '' : String(answer.awardedMarks),
  );
  const [feedback, setFeedback] = useState(answer.feedback ?? '');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const parsed = Number(marks);
  const valid = marks.trim() !== '' && Number.isFinite(parsed) && parsed >= 0;
  const clamped = valid ? clampAwardedMarks(parsed, answer.marks) : null;
  const overMax = valid && parsed > answer.marks;

  const save = async () => {
    if (!valid) return;
    setBusy(true);
    setErr(null);
    setSaved(false);
    try {
      const res = await evaluateAnswer(answer.answerId, {
        awardedMarks: parsed,
        feedback: feedback.trim() || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved(
        {
          ...answer,
          awardedMarks: clamped,
          feedback: feedback.trim() || null,
          evaluatedAt: new Date().toISOString(),
        },
        res.pendingCount,
        res.score,
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save that mark.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-base font-bold text-navy">
          <span className="text-slate-400">{index}.</span> {answer.stem}
        </p>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
          {answer.marks} mark{answer.marks === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mt-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Student&apos;s answer · {answer.wordCount} words
          {answer.maxWords ? ` (limit ${answer.maxWords})` : ''}
        </p>
        {answer.textAnswer?.trim() ? (
          <p className="mt-1.5 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
            {answer.textAnswer}
          </p>
        ) : (
          <p className="mt-1.5 text-sm font-semibold text-amber-600">
            Not answered — award 0 to close this out.
          </p>
        )}
      </div>

      {answer.answerGuidance?.trim() ? (
        <div className="mt-3 rounded-lg bg-violet-50 p-3 ring-1 ring-violet-200">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-700">
            Marking guidance · not shown to the student
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-violet-900">
            {answer.answerGuidance}
          </p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-[10rem_1fr]">
        <label className="block space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Marks (0–{answer.marks})
          </span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={answer.marks}
            step={0.5}
            value={marks}
            onChange={(e) => setMarks(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
            placeholder="—"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Feedback — the student reads this
          </span>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            maxLength={5000}
            className="min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-navy focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
            placeholder="What was good, what was missing."
          />
        </label>
      </div>

      {overMax ? (
        <p className="mt-2 text-xs font-medium text-amber-700">
          This question is out of {answer.marks}. {parsed} will be saved as {clamped}.
        </p>
      ) : null}
      {err ? <p className="mt-2 text-xs font-medium text-red-600">{err}</p> : null}

      <div className="mt-3 flex items-center gap-3">
        <Button type="button" size="sm" onClick={() => void save()} disabled={!valid || busy}>
          {busy ? <Loader2 className="animate-spin" /> : saved ? <Check /> : null}
          {saved ? 'Saved' : answer.awardedMarks === null ? 'Award marks' : 'Update marks'}
        </Button>
        {answer.evaluatedAt ? (
          <span className="text-xs text-slate-400">marked {when(answer.evaluatedAt)}</span>
        ) : (
          <span className="text-xs font-semibold text-amber-700">not marked yet</span>
        )}
      </div>
    </li>
  );
}
