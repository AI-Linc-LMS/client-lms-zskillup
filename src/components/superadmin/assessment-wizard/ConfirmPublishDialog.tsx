'use client';

import { useId } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogShell } from './DialogShell';
import { QUESTION_ORDER_NOTE } from './ReviewStep';
import type { SelectionTally } from './selection';
import { eyebrowCls } from './ui';

const fmt = (localDateTime: string) =>
  localDateTime
    ? new Date(localDateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    : '—';

/**
 * Last stop before the create / append call: totals, marks, the window and the audience,
 * in one place — the admin confirms exactly what goes live.
 */
export function ConfirmPublishDialog({
  open,
  mode,
  deadlineOnly = false,
  tally,
  title,
  audience,
  startAt,
  endAt,
  durationMinutes,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  /** The drive has attempts: the ONLY thing this save changes is its closing date, so the
   *  question/marks facts are dropped — showing "Adding 0" would read like a failed append. */
  deadlineOnly?: boolean;
  tally: SelectionTally;
  title: string;
  audience: string;
  /** datetime-local values. */
  startAt: string;
  endAt: string;
  durationMinutes: number;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const n = tally.total;
  const action = deadlineOnly
    ? 'Save closing date'
    : mode === 'create'
      ? `Create & publish ${n} ${n === 1 ? 'question' : 'questions'}`
      : n > 0
        ? `Save & add ${n} ${n === 1 ? 'question' : 'questions'}`
        : 'Save changes';

  return (
    <DialogShell open={open} onClose={onCancel} labelledBy={titleId} dismissible={!busy} maxWidth="max-w-md">
      <div className="space-y-5 p-6">
        <div>
          <p className={eyebrowCls}>
            {deadlineOnly ? 'Confirm new closing date' : mode === 'create' ? 'Ready to publish' : 'Confirm changes'}
          </p>
          <h2 id={titleId} className="mt-1 text-lg font-bold text-navy">
            {action}?
          </h2>
          <p className="mt-1 text-sm text-slate-600">{title || 'Untitled assessment'}</p>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          {deadlineOnly ? null : (
            <>
              <Fact label={mode === 'create' ? 'Questions' : 'Adding'} value={`${n} (${tally.mcq} MCQ · ${tally.coding} coding)`} />
              <Fact label={mode === 'create' ? 'Total marks' : 'Marks added'} value={String(tally.marks)} />
            </>
          )}
          <Fact label="Opens" value={fmt(startAt)} />
          <Fact label={deadlineOnly ? 'New close' : 'Closes'} value={fmt(endAt)} />
          <Fact label="Time per attempt" value={`${durationMinutes} min`} />
          <Fact label="Audience" value={audience} />
        </dl>
        {deadlineOnly ? (
          <p className="text-sm leading-relaxed text-slate-600">
            Only the closing date changes. Every recorded attempt keeps its answers and score, and students who have not
            attempted it yet can start until the new time.
          </p>
        ) : null}

        {n > 0 ? (
          <div className="space-y-1.5">
            <p className="text-sm leading-relaxed text-slate-600">
              These exact questions are fixed — every student gets this set; nothing is re-drawn when it goes live.
              {mode === 'create' ? ' Students in the audience are notified once it is published.' : ''}
            </p>
            <p className="text-sm text-slate-500">{QUESTION_ORDER_NOTE}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Back to review
          </Button>
          <Button type="button" onClick={onConfirm} disabled={busy} data-autofocus>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {action}
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 px-3 py-2">
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</dt>
      <dd className="mt-0.5 font-semibold text-navy">{value}</dd>
    </div>
  );
}
