'use client';

import { useId, useState } from 'react';
import { CopyPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogShell } from '@/components/superadmin/assessment-wizard/DialogShell';
import { eyebrowCls, fieldLabelCls, inputCls } from '@/components/superadmin/assessment-wizard/ui';
import { describeApiError } from '@/lib/api/types';
import { duplicateAssessment, type DuplicatedAssessment } from '@/lib/api/assessment-builder';

/** An ISO instant as the value a `datetime-local` input wants (local wall clock). */
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const PRESETS: Array<{ label: string; days: number }> = [
  { label: 'Same time next week', days: 7 },
  { label: 'Tomorrow', days: 1 },
];

/**
 * RE-RUN A DRIVE: same paper, new window.
 *
 * Running the same assessment again meant walking the whole wizard and re-picking
 * every question by hand — so in practice it was done by copying rows in the
 * database, which is where two traps live. This does it properly:
 *
 *   - the questions are copied into a NEW mock, so students who sat the original are
 *     not locked out (attempts are keyed on the mock, not the drive);
 *   - the paywall and proctoring settings come from the source, so a re-run of a free,
 *     open drive does not quietly become a paid one.
 *
 * The copy is created UNPUBLISHED. Publishing emails its audience, and that stays a
 * separate, deliberate action.
 */
export function DuplicateAssessmentDialog({
  assessmentId,
  title,
  scheduledAt,
  endsAt,
  durationMinutes,
  onClose,
  onDuplicated,
}: {
  assessmentId: string;
  title: string;
  scheduledAt: string;
  endsAt: string | null;
  durationMinutes: number;
  onClose: () => void;
  onDuplicated: (created: DuplicatedAssessment) => void;
}) {
  const titleId = useId();
  const nameId = useId();
  const startId = useId();
  const endId = useId();

  // Default to the same slot a week on — what "weekly assessment" almost always means.
  const weekOn = (iso: string) => toLocalInput(new Date(new Date(iso).getTime() + 7 * 86_400_000).toISOString());
  const [name, setName] = useState(`${title} (copy)`);
  const [start, setStart] = useState(weekOn(scheduledAt));
  const [end, setEnd] = useState(endsAt ? weekOn(endsAt) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startMs = start ? new Date(start).getTime() : NaN;
  const endMs = end ? new Date(end).getTime() : null;
  const endsBeforeStart = endMs !== null && !Number.isNaN(startMs) && endMs <= startMs;
  const canSave = !!name.trim() && !Number.isNaN(startMs) && !endsBeforeStart && !saving;

  /** Shift both ends of the window together, keeping its length. */
  const preset = (days: number) => {
    const from = new Date(scheduledAt).getTime() + days * 86_400_000;
    setStart(toLocalInput(new Date(from).toISOString()));
    if (endsAt) {
      const length = new Date(endsAt).getTime() - new Date(scheduledAt).getTime();
      setEnd(toLocalInput(new Date(from + length).toISOString()));
    }
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      onDuplicated(
        await duplicateAssessment(assessmentId, {
          title: name.trim(),
          scheduledAt: new Date(startMs).toISOString(),
          endsAt: endMs !== null ? new Date(endMs).toISOString() : undefined,
        }),
      );
    } catch (e) {
      setError(describeApiError(e, 'Could not duplicate this assessment.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogShell open onClose={onClose} labelledBy={titleId} dismissible={!saving} maxWidth="max-w-md">
      <div className="space-y-5 p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
            <CopyPlus className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className={eyebrowCls}>Run it again</p>
            <h2 id={titleId} className="mt-1 text-base font-bold text-navy">
              Duplicate assessment
            </h2>
            <p className="truncate text-sm text-slate-500">{title}</p>
          </div>
        </div>

        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-600 shadow-sm">
          The same questions, marks and sections are copied into a fresh question set, so
          everyone can sit it — including students who already took the original. Proctoring
          and access settings are copied too.
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor={nameId} className={fieldLabelCls}>
              Title
            </label>
            <input
              id={nameId}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              className={inputCls}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => preset(p.days)}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={startId} className={fieldLabelCls}>
                Opens
              </label>
              <input
                id={startId}
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor={endId} className={fieldLabelCls}>
                Closes
              </label>
              <input
                id={endId}
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className={inputCls}
                aria-invalid={endsBeforeStart}
              />
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Timer stays at {durationMinutes}&nbsp;minutes. Leave &ldquo;Closes&rdquo; empty for no
            closing time.
          </p>

          {endsBeforeStart && (
            <p role="alert" className="text-sm font-medium text-red-700">
              The closing time must be after the opening time.
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={!canSave}>
            {saving ? <Loader2 className="animate-spin" /> : <CopyPlus />}
            Create copy
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
