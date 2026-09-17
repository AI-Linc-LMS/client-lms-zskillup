'use client';

import { useEffect, useId, useState } from 'react';
import { CalendarClock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogShell } from '@/components/superadmin/assessment-wizard/DialogShell';
import { eyebrowCls, fieldLabelCls, inputCls } from '@/components/superadmin/assessment-wizard/ui';
import { describeApiError } from '@/lib/api/types';
import {
  extendAssessmentDeadline,
  getEditableAssessment,
  type EditableAssessment,
} from '@/lib/api/assessment-builder';

/** An ISO instant as the value a `datetime-local` input wants (local wall clock). */
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'No closing time set';

const PRESETS: Array<{ label: string; days: number }> = [
  { label: '+1 day', days: 1 },
  { label: '+3 days', days: 3 },
  { label: '+1 week', days: 7 },
];

/**
 * Extend (or correct) a scheduled assessment's closing date/time — the whole flow in one
 * small dialog, because "give this running drive two more days" should not mean walking
 * the three-step wizard for a single field.
 *
 * The drive's questions, marks, start, duration and audience are frozen the moment anyone
 * attempts it; its close is not, because the window is only checked when a NEW attempt
 * starts. Moving it therefore changes nothing that already happened — it only decides who
 * may still sit the paper, which is exactly what an extension is for.
 *
 * Reads the current window from the server when it opens (rather than trusting the row it
 * was launched from), so the admin always edits the real value, and works identically for
 * a super-admin and for a TPO on their own college's drive.
 */
export function ExtendDeadlineDialog({
  assessmentId,
  title,
  onClose,
  onSaved,
}: {
  assessmentId: string;
  /** Shown while the snapshot loads, so the dialog is never anonymous. */
  title: string;
  onClose: () => void;
  /** The saved snapshot — refresh the list from here. */
  onSaved: (saved: EditableAssessment) => void;
}) {
  const titleId = useId();
  const fieldId = useId();
  const [existing, setExisting] = useState<EditableAssessment | null>(null);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getEditableAssessment(assessmentId)
      .then((e) => {
        if (!alive) return;
        setExisting(e);
        setValue(e.endsAt ? toLocalInput(e.endsAt) : '');
      })
      .catch((e: unknown) => alive && setError(describeApiError(e, 'Could not load this assessment.')));
    return () => {
      alive = false;
    };
  }, [assessmentId]);

  const startMs = existing ? new Date(existing.scheduledAt).getTime() : null;
  const closeMs = existing?.endsAt ? new Date(existing.endsAt).getTime() : null;
  const nextMs = value ? new Date(value).getTime() : null;
  const hasClosed = closeMs !== null && closeMs < Date.now();
  const beforeStart = nextMs !== null && startMs !== null && nextMs <= startMs;
  // Compare the FIELD's value, not the instants: the input has minute precision, so a
  // stored close carrying seconds would otherwise read as "changed" the moment it loads
  // and arm Save before the admin has touched anything.
  const unchanged = !!existing && value === (existing.endsAt ? toLocalInput(existing.endsAt) : '');
  const canSave = !!existing && nextMs !== null && !Number.isNaN(nextMs) && !beforeStart && !unchanged && !saving;

  /** Push the close out by N days from whichever is later: now, or the current close. */
  const preset = (days: number) => {
    const from = Math.max(Date.now(), closeMs ?? 0);
    setValue(toLocalInput(new Date(from + days * 86_400_000).toISOString()));
  };

  const save = async () => {
    if (!canSave || nextMs === null) return;
    setSaving(true);
    setError(null);
    try {
      onSaved(await extendAssessmentDeadline(assessmentId, new Date(nextMs).toISOString()));
    } catch (e) {
      setError(describeApiError(e, 'Could not change the closing time.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogShell open onClose={onClose} labelledBy={titleId} dismissible={!saving} maxWidth="max-w-md">
      <div className="space-y-5 p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-600 ring-1 ring-orange-100">
            <CalendarClock className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className={eyebrowCls}>Assessment window</p>
            <h2 id={titleId} className="mt-1 text-base font-bold text-navy">
              Extend deadline
            </h2>
            <p className="truncate text-sm text-slate-500">{existing?.title ?? title}</p>
          </div>
        </div>

        {existing ? (
          <dl className="grid gap-x-6 gap-y-1.5 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm sm:grid-cols-2">
            <div>
              <dt className={eyebrowCls}>Opens</dt>
              <dd className="mt-0.5 font-semibold text-navy">{when(existing.scheduledAt)}</dd>
            </div>
            <div>
              <dt className={eyebrowCls}>{hasClosed ? 'Closed' : 'Closes'}</dt>
              <dd className="mt-0.5 font-semibold text-navy">{when(existing.endsAt)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className={eyebrowCls}>Attempts so far</dt>
              <dd className="mt-0.5 text-slate-600">
                {existing.attempts === 0
                  ? 'None yet'
                  : `${existing.attempts} — these keep their answers, scores and questions exactly as they are.`}
              </dd>
            </div>
          </dl>
        ) : error ? null : (
          <div className="grid h-24 place-items-center">
            <Loader2 className="size-5 animate-spin text-slate-500" aria-label="Loading" />
          </div>
        )}

        {existing ? (
          <div className="space-y-2">
            <label htmlFor={fieldId} className={fieldLabelCls}>
              New closing date &amp; time
            </label>
            <input
              id={fieldId}
              data-autofocus
              type="datetime-local"
              value={value}
              disabled={saving}
              onChange={(e) => setValue(e.target.value)}
              aria-invalid={beforeStart || undefined}
              aria-describedby={`${fieldId}-help`}
              className={inputCls}
            />
            <div className="flex flex-wrap items-center gap-1.5">
              {PRESETS.map((p) => (
                <Button key={p.label} type="button" variant="outline" size="sm" disabled={saving} onClick={() => preset(p.days)}>
                  {p.label}
                </Button>
              ))}
            </div>
            <p id={`${fieldId}-help`} className="text-xs text-slate-500">
              {hasClosed
                ? 'This assessment has closed. A closing time in the future re-opens it, and students who have not attempted it yet can start until then.'
                : 'Students who have not attempted it yet can start until this time. Nothing else about the assessment changes.'}
            </p>
          </div>
        ) : null}

        {beforeStart ? (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
            The closing time must be after the assessment opens.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={!canSave}>
            {saving ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {unchanged ? 'No change yet' : 'Save closing time'}
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
