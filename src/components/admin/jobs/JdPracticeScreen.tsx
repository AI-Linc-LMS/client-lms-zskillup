'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CircleHelp, Info, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { describeError } from '@/lib/api/errors';
import {
  ADMIN_JOBS_BASE,
  applyJdExtraction,
  extractJd,
  getRoundPlans,
  reviewJdExtraction,
  type JdExtractionResultDto,
  type JobsApiBase,
  type RoundPlansDto,
} from '@/lib/api/jobs';
import { ExtractionConfidence, type ExtractedField } from '@/shared/jd-extraction';

const label = 'text-[10px] font-semibold uppercase tracking-widest text-slate-400';

/** A field the reader found — with how it found it, so an inference can be checked. */
function Found<T>({ name, field, render }: { name: string; field?: ExtractedField<T>; render?: (v: T) => string }) {
  if (!field) return null;
  const inferred = field.confidence === ExtractionConfidence.INFERRED;
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
      <span className="text-sm text-slate-600">{name}</span>
      <span className="text-right">
        <span className="text-sm font-semibold text-navy">
          {render ? render(field.value) : String(field.value)}
        </span>
        {/* An inferred value is not a stated one, and the operator is the one who should
            decide whether the guess is right. */}
        {inferred ? (
          <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
            inferred — check
          </span>
        ) : null}
      </span>
    </div>
  );
}

/**
 * READING A JD, AND PLANNING EACH ROUND'S PRACTICE (PRD §23.1, §23.2).
 *
 * Three behaviours here are the PRD's rules made visible, and they are the reason this
 * screen exists rather than a plain form:
 *
 *   WHAT THE JD DID NOT SAY IS SHOWN AS A PROMPT, NOT A BLANK. §23.1: "never assume
 *   missing round details; let the user add or configure them." An empty round plan is a
 *   CORRECT answer, and the screen says so — because a plausible four-round plan is
 *   exactly what somebody approves without reading, and then a cohort practises for rounds
 *   the employer never had.
 *
 *   REQUIREMENT SENTENCES ARE SHOWN VERBATIM AND LABELLED AS NOT RULES. "Minimum 60% in
 *   graduation" looks easy to parse and is not — 60% of what, aggregate or final year,
 *   does a backlog count — and §4's rules decide who may apply. A mis-parsed rule would
 *   exclude real students silently.
 *
 *   A ROUND ONLY A PERSON CAN SCORE IS NEVER OFFERED A PASS MARK. §23.3 separates
 *   auto-scored rounds from rubric-reviewed ones, and a case study with "pass mark 60"
 *   would show students a threshold no number is ever compared against.
 */
/** `base` lets the TPO console read the same round plans through its college-scoped
 *  controller. Defaults to the admin PMS. */
export function JdPracticeScreen({
  driveId,
  base = ADMIN_JOBS_BASE,
}: {
  driveId: string;
  base?: JobsApiBase;
}) {
  const [jdText, setJdText] = useState('');
  const [result, setResult] = useState<JdExtractionResultDto | null>(null);
  const [plans, setPlans] = useState<RoundPlansDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmReplace, setConfirmReplace] = useState<{ wouldReplace: number } | null>(null);

  const loadPlans = useCallback(async () => {
    try {
      setPlans(await getRoundPlans(driveId, base));
    } catch {
      /* A drive with no rounds yet has no plans — not an error worth a banner. */
    }
  }, [driveId]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const read = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await extractJd({ jdText, driveId }));
    } catch (e) {
      setError(describeError(e, 'Could not read that job description.'));
    } finally {
      setBusy(false);
    }
  };

  const apply = async (replaceExisting: boolean) => {
    if (!result) return;
    setBusy(true);
    try {
      // Review first — the server refuses to apply an unreviewed draft by name, because
      // the whole point of the draft default is that somebody looked.
      await reviewJdExtraction(result.id, null);
      const out = await applyJdExtraction(result.id, { driveId, replaceExisting });
      if (!out.applied && out.wouldReplace) {
        setConfirmReplace({ wouldReplace: out.wouldReplace });
        return;
      }
      toast.success(`${out.rounds} round${out.rounds === 1 ? '' : 's'} written to this drive.`);
      setConfirmReplace(null);
      setResult(null);
      setJdText('');
      await loadPlans();
    } catch (e) {
      toast.error(describeError(e, 'Could not apply the round plan.'));
    } finally {
      setBusy(false);
    }
  };

  const ex = result?.extraction;

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className={label}>JD to practice</p>
        <h2 className="mt-1 text-lg font-bold text-navy">Read the job description</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Paste the employer&rsquo;s description and the platform will pull out the role, the
          skills and the selection rounds it actually names. Nothing is written to the drive
          until you apply it &mdash; and if the description does not describe its rounds, the
          plan comes back <span className="font-semibold">empty on purpose</span>.
        </p>
        <textarea
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          rows={8}
          placeholder="Paste the full job description…"
          className="mt-4 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
        />
        <div className="mt-3 flex items-center gap-3">
          <Button onClick={read} disabled={busy || jdText.trim().length < 40}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Read it
          </Button>
          <span className="text-xs text-slate-400 tabular-nums">
            {jdText.trim().length < 40
              ? 'Paste at least a paragraph'
              : `${jdText.length.toLocaleString('en-IN')} characters`}
          </span>
        </div>
        {error ? (
          <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
            {error}
          </p>
        ) : null}
      </div>

      {ex ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className={label}>What it says</p>
            <div className="mt-2">
              <Found name="Company" field={ex.companyName} />
              <Found name="Role" field={ex.role} />
              <Found name="Seniority" field={ex.seniority} />
              <Found name="Skills" field={ex.skills} render={(v) => (v as string[]).join(', ')} />
              <Found name="Tools" field={ex.tools} render={(v) => (v as string[]).join(', ')} />
              <Found name="Locations" field={ex.locations} render={(v) => (v as string[]).join(', ')} />
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Read by {ex.source === 'AI' ? 'the model' : 'phrase matching'} from{' '}
              {ex.jdLength.toLocaleString('en-IN')} characters.
            </p>
          </div>

          {/* The half that matters: absences shown as work to do, never as empty fields. */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className={label}>What it does not say</p>
            {ex.notFound.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Everything was stated.</p>
            ) : (
              <>
                <p className="mt-1 text-sm text-slate-600">
                  You will need to supply these &mdash; nothing has been guessed:
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {ex.notFound.map((f) => (
                    <li
                      key={f}
                      className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600"
                    >
                      {f}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {ex.eligibilityHints ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
              <p className={label}>Requirement sentences</p>
              <p className="mt-1 flex items-start gap-2 text-sm leading-relaxed text-slate-600">
                <Info className="mt-0.5 size-4 shrink-0 text-sky-600" aria-hidden />
                <span>
                  Shown exactly as written and{' '}
                  <span className="font-semibold">not turned into eligibility rules</span>.
                  &ldquo;Minimum 60% in graduation&rdquo; is ambiguous &mdash; 60% of what,
                  aggregate or final year, and does a backlog count &mdash; and a mis-read
                  rule would exclude real students silently. Write the rules yourself on the
                  drive.
                </span>
              </p>
              <ul className="mt-3 space-y-1">
                {ex.eligibilityHints.value.map((h, i) => (
                  <li key={i} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <p className={label}>Rounds it names</p>
            {result.roundPlan.length === 0 ? (
              <p className="mt-2 flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  <span className="font-semibold">This description does not describe its
                  selection process</span>, so no rounds were produced. That is the correct
                  answer rather than a failure &mdash; a plausible guessed plan is exactly
                  what gets approved unread, and then a cohort practises for rounds the
                  employer never had. Add the rounds by hand on the drive.
                </span>
              </p>
            ) : (
              <>
                <ol className="mt-2 space-y-2">
                  {result.roundPlan.map((r) => (
                    <li
                      key={r.sequence}
                      className="flex items-start gap-3 rounded-lg bg-slate-50 px-3 py-2"
                    >
                      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-white text-xs font-bold text-navy ring-1 ring-slate-200 tabular-nums">
                        {r.sequence}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-navy">{r.name}</p>
                        <p className="text-xs text-slate-500">
                          {r.practice.practice === 'NONE'
                            ? (r.practice.noPracticeReason ?? 'Nothing to practise')
                            : `${r.practice.practice.toLowerCase().replace('_', ' ')} · ${r.practice.competencies.join(', ')}`}
                          {r.practice.practice !== 'NONE' && !r.practice.autoScored
                            ? ' · scored by a person'
                            : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="mt-4 flex items-center gap-3">
                  <Button onClick={() => apply(false)} disabled={busy}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : null} Apply to this drive
                  </Button>
                  <span className="text-xs text-slate-400">
                    Reviews and writes these rounds. Existing rounds are never replaced
                    without asking.
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {plans ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <p className={label}>Practice plans</p>
              <p className="mt-0.5 text-base font-bold text-navy">Each round&rsquo;s preparation</p>
            </div>
            {/* Leads with what is NOT done: an unplanned round is what catches a team out
                the week before a drive. */}
            <p className="text-sm text-slate-600 tabular-nums">
              <span className="font-semibold text-navy">{plans.summary.awaitingPlan}</span> of{' '}
              {plans.summary.total} awaiting a plan
              {plans.summary.nothingToPractise > 0
                ? ` · ${plans.summary.nothingToPractise} need none`
                : ''}
            </p>
          </div>
          {plans.rounds.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">
              This drive has no planned rounds yet.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {plans.rounds.map((r) => (
                <li key={r.roundId} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-100 text-xs font-bold tabular-nums">
                    {r.sequence}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-navy">{r.label}</p>
                    <p className="text-xs text-slate-500">
                      {r.practiceFormat === 'NONE'
                        ? r.noPracticeReason
                        : r.competencies.join(', ')}
                    </p>
                  </div>
                  {r.practiceFormat === 'NONE' ? (
                    <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                      nothing to practise
                    </span>
                  ) : r.plan ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                      planned
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                      awaiting a plan
                    </span>
                  )}
                  {/* §23.3: a round a person must score cannot be given a pass mark, and
                      the chip says so rather than the form silently refusing one later. */}
                  {r.practiceFormat !== 'NONE' && !r.autoScored ? (
                    <span
                      className="inline-flex items-center gap-1 text-[11px] text-slate-400"
                      title="Scored against a rubric by a person, so a pass mark would be a threshold nothing is compared against"
                    >
                      <CircleHelp className="size-3.5" aria-hidden /> rubric
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmReplace !== null}
        eyebrow="Confirm"
        title="Replace this drive’s existing rounds?"
        confirmLabel="Replace them"
        tone="destructive"
        busy={busy}
        onConfirm={() => apply(true)}
        onClose={() => setConfirmReplace(null)}
      >
        <p>
          This drive already has{' '}
          <span className="font-semibold text-navy tabular-nums">
            {confirmReplace?.wouldReplace}
          </span>{' '}
          round{confirmReplace?.wouldReplace === 1 ? '' : 's'}. Applying the new plan replaces
          them. Any assessment already linked to a replaced round will need re-linking, and
          candidates recorded against one keep their history but lose the round it pointed at.
        </p>
      </ConfirmDialog>
    </section>
  );
}
