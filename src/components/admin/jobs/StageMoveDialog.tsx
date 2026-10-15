'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  ApplicationStage,
  LEGACY_STATUS_MAP,
  REASON_REQUIRED_STAGES,
  STAGE_LABELS,
  checkStageMove,
  isTerminal,
  stageOptions,
} from '@/shared/application-pipeline';
import type { PlannedRound } from '@/shared/drive-rounds';
import { roundLabel, sortRounds } from '@/shared/drive-rounds';

const label = 'text-[10px] font-semibold uppercase tracking-widest text-slate-400';

/**
 * MOVING ONE CANDIDATE THROUGH THE PIPELINE (PRD §10).
 *
 * Before this, the admin panel could only set the six legacy statuses and could not attach
 * a reason to any of them. §10's whole point is that "who rejected me, when, and why" is
 * the question a student actually asks — so a rejection without a reason was the one thing
 * the UI made easy.
 *
 * Three rules are enforced here as well as on the server, deliberately duplicated via the
 * shared contract so the message is identical in both places:
 *
 *   - a reason is REQUIRED for a rejection, hold, waitlist, needs-info, no-show or
 *     did-not-join. Not for the system's benefit: the student will ask, and the person who
 *     decided will not remember in six weeks.
 *   - moving to a round needs to say WHICH round, so "Round 2" means the drive's second
 *     planned round rather than a number the UI invented.
 *   - nothing moves out of JOINED. Somebody started the job; that is a fact about the
 *     world, and editing it would be rewriting rather than recording a change of mind.
 *
 * AND IT SAYS WHAT THE CANDIDATE WILL SEE. §11 mails the stage and never the internal
 * reason or the panel's feedback. An admin typing "weak on fundamentals, do not progress"
 * needs to know that sentence stays inside the platform — otherwise they either write
 * something unusable or assume the worst and write nothing.
 */
export function StageMoveDialog({
  open,
  candidateName,
  currentStatus,
  rounds,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  candidateName: string;
  /** The stored status, which may still be one of the six pre-§10 values. */
  currentStatus: string;
  rounds: PlannedRound[];
  busy?: boolean;
  onConfirm: (input: {
    to: ApplicationStage;
    reason: string | null;
    roundId: string | null;
    feedback: string | null;
  }) => void;
  onClose: () => void;
}) {
  // A pre-§10 row stores one of the six old statuses; read it through the legacy map so
  // the dialog opens on the right stage rather than on nothing.
  const from = (LEGACY_STATUS_MAP[currentStatus] ?? currentStatus) as ApplicationStage;

  const [to, setTo] = useState<ApplicationStage | ''>('');
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [roundId, setRoundId] = useState('');

  const options = useMemo(() => stageOptions(from), [from]);
  const needsReason = to ? REASON_REQUIRED_STAGES.includes(to) : false;
  const needsRound = to === ApplicationStage.IN_ROUND;

  // The SAME check the server runs, so the dialog cannot offer a move the API refuses.
  const problem = useMemo(
    () =>
      to
        ? checkStageMove({ from, to, reason: reason || null, roundId: roundId || null })
        : null,
    [from, to, reason, roundId],
  );

  const reset = () => {
    setTo('');
    setReason('');
    setFeedback('');
    setRoundId('');
  };

  return (
    <ConfirmDialog
      open={open}
      eyebrow="Pipeline"
      title={`Move ${candidateName}`}
      confirmLabel="Record the move"
      tone={to === ApplicationStage.REJECTED ? 'destructive' : 'default'}
      busy={busy}
      busyLabel="Recording"
      confirmDisabled={!to || problem !== null}
      onConfirm={() =>
        to &&
        onConfirm({
          to,
          reason: reason.trim() || null,
          roundId: roundId || null,
          feedback: feedback.trim() || null,
        })
      }
      onClose={() => {
        reset();
        onClose();
      }}
    >
      <p className="text-sm text-slate-600">
        Currently <span className="font-semibold text-navy">{STAGE_LABELS[from] ?? from}</span>.
        {isTerminal(from) ? ' This candidate’s run has already ended — moving them re-opens it.' : ''}
      </p>

      {options.length === 0 ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            This candidate has <span className="font-semibold">joined</span>, which is a fact
            about the world rather than a stage. Record an offer change instead — editing it
            here would rewrite the record rather than note a change of mind.
          </span>
        </p>
      ) : (
        <>
          <label className="mt-4 block">
            <span className={label}>Move to</span>
            <select
              value={to}
              onChange={(e) => setTo(e.target.value as ApplicationStage)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
            >
              <option value="">Choose a stage…</option>
              {options.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </label>

          {needsRound ? (
            <label className="mt-3 block">
              <span className={label}>Which round</span>
              {rounds.length === 0 ? (
                <p className="mt-1 text-sm text-amber-800">
                  This drive has no planned rounds yet — add them on the drive before moving
                  anybody into one.
                </p>
              ) : (
                <select
                  value={roundId}
                  onChange={(e) => setRoundId(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
                >
                  <option value="">Choose a round…</option>
                  {sortRounds(rounds).map((r) => (
                    <option key={r.id} value={r.id}>
                      {roundLabel(r)}
                    </option>
                  ))}
                </select>
              )}
            </label>
          ) : null}

          {to ? (
            <label className="mt-3 block">
              <span className={label}>
                Reason {needsReason ? '(required)' : '(optional)'}
              </span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder={
                  needsReason
                    ? 'The candidate will ask, and you will not remember in six weeks.'
                    : 'Why this move — for the record.'
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
              />
            </label>
          ) : null}

          {to ? (
            <label className="mt-3 block">
              <span className={label}>Panel feedback (optional)</span>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={2}
                placeholder="What the interviewer or employer actually said."
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
              />
            </label>
          ) : null}

          {/* The thing an admin has to know before they write anything candid. */}
          {to ? (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-sky-50 p-4 text-sm leading-relaxed text-sky-900 ring-1 ring-sky-200">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                The candidate is told the <span className="font-semibold">stage only</span>.
                Neither the reason nor the panel feedback is ever emailed to them — both stay
                inside the platform for your team and for answering a later question.
              </span>
            </p>
          ) : null}

          {problem ? (
            <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
              {problem.message}
            </p>
          ) : null}
        </>
      )}
    </ConfirmDialog>
  );
}
