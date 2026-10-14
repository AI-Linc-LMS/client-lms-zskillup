'use client';

import { useId, useState } from 'react';
import { Loader2, MoveRight, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { describeError } from '@/lib/api/errors';
import { transitionDrive } from '@/lib/api/jobs';
import type { JobPostingDto } from '@/shared/dto/jobs.dto';
import { JobStatus } from '@/shared/enums';
import {
  DRIVE_STATUS_LABELS,
  REASON_REQUIRED_STATUSES,
  acceptsApplications,
  isStudentVisible,
  nextStatuses,
} from '@/shared/drive-lifecycle';

const input =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30';
const area =
  'w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30';
const eyebrow = 'text-[10px] font-semibold uppercase tracking-widest text-slate-400';

/** What this move will actually do, said before it is made rather than after. */
function consequence(to: JobStatus): string | null {
  if (to === JobStatus.CANCELLED) {
    return 'Everyone who applied is emailed, with the reason you give. Their applications are kept — cancelling a drive never deletes them.';
  }
  if (to === JobStatus.ON_HOLD) {
    return 'The drive comes off the board, including its direct link. Applications, rounds and offers are left exactly as they are.';
  }
  if (to === JobStatus.ARCHIVED) {
    return 'This is final. An archived drive is a read-only record and cannot be moved again.';
  }
  if (!isStudentVisible(to)) return 'Students will not be able to see this drive.';
  if (!acceptsApplications(to)) {
    return 'The drive stays readable, but it stops accepting new applications.';
  }
  return null;
}

/**
 * MOVE A DRIVE THROUGH ITS LIFE (PRD §5).
 *
 * Deliberately not a dropdown on the edit form. A status move is something somebody DID,
 * with consequences that reach other people — cancelling emails every applicant — so it
 * gets a decision screen that states the consequence BEFORE the click rather than a toast
 * after it. The three moves that cannot be undone or that reach students say so plainly.
 *
 * Only reachable statuses are offered, from the same transition map the server enforces,
 * so the UI cannot propose a move the API will refuse.
 */
export function DriveStatusDialog({
  job,
  onClose,
  onMoved,
}: {
  job: JobPostingDto;
  onClose: () => void;
  onMoved: (next: JobPostingDto) => void;
}) {
  const titleId = useId();
  const toId = useId();
  const reasonId = useId();
  const reviewId = useId();

  const options = nextStatuses(job.status);
  const [to, setTo] = useState<JobStatus | ''>(options[0] ?? '');
  const [reason, setReason] = useState('');
  const [reviewDate, setReviewDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsReason = !!to && REASON_REQUIRED_STATUSES.includes(to);
  const ready = !!to && (!needsReason || reason.trim().length > 0);
  const note = to ? consequence(to) : null;

  const submit = async () => {
    if (!ready || !to) return;
    setBusy(true);
    setError(null);
    try {
      const next = await transitionDrive(job.id, to, {
        reason: reason.trim() || null,
        nextReviewDate: to === JobStatus.ON_HOLD ? reviewDate || null : null,
      });
      toast.success(`Moved to ${DRIVE_STATUS_LABELS[to].toLowerCase()}.`);
      onMoved(next);
    } catch (e) {
      setError(describeError(e, 'Could not move this drive.'));
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={busy ? () => {} : onClose} maxWidth="max-w-md">
      <div className="space-y-5 p-6">
        <div>
          <p className={eyebrow}>Drive status</p>
          <h2 id={titleId} className="mt-1 text-base font-bold text-navy">
            Move this drive on
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
            <span className="font-semibold text-navy">{DRIVE_STATUS_LABELS[job.status]}</span>
            <MoveRight className="size-3.5 shrink-0 text-slate-400" aria-hidden />
            <span>{to ? DRIVE_STATUS_LABELS[to] : '…'}</span>
          </p>
        </div>

        {options.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            An archived drive is a read-only record — there is nowhere left to move it.
          </p>
        ) : (
          <>
            <div>
              <label htmlFor={toId} className={eyebrow}>
                Move to
              </label>
              <select
                id={toId}
                value={to}
                onChange={(e) => setTo(e.target.value as JobStatus)}
                className={cn(input, 'mt-1.5')}
              >
                {options.map((s) => (
                  <option key={s} value={s}>
                    {DRIVE_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor={reasonId} className={eyebrow}>
                Reason {needsReason ? '(required)' : '(optional)'}
              </label>
              <textarea
                id={reasonId}
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  to === JobStatus.CANCELLED
                    ? 'Shown to every applicant in the email'
                    : 'Kept on the drive’s history'
                }
                className={cn(area, 'mt-1.5')}
              />
            </div>

            {to === JobStatus.ON_HOLD ? (
              <div>
                <label htmlFor={reviewId} className={eyebrow}>
                  Look at this again on
                </label>
                <input
                  id={reviewId}
                  type="date"
                  value={reviewDate}
                  onChange={(e) => setReviewDate(e.target.value)}
                  className={cn(input, 'mt-1.5')}
                />
                <p className="mt-1 text-xs text-slate-500">
                  So a cold drive resurfaces instead of being quietly forgotten.
                </p>
              </div>
            ) : null}

            {note ? (
              <p
                className={cn(
                  'flex items-start gap-2 rounded-xl p-3 text-xs leading-relaxed ring-1',
                  to === JobStatus.CANCELLED || to === JobStatus.ARCHIVED
                    ? 'bg-amber-50 text-amber-900 ring-amber-200'
                    : 'bg-slate-50 text-slate-600 ring-slate-200',
                )}
              >
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span>{note}</span>
              </p>
            ) : null}
          </>
        )}

        {error ? (
          <p
            role="alert"
            className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200"
          >
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          {options.length > 0 ? (
            <Button onClick={() => void submit()} disabled={!ready || busy}>
              {busy ? <Loader2 className="animate-spin" /> : <MoveRight />}
              {to ? `Move to ${DRIVE_STATUS_LABELS[to].toLowerCase()}` : 'Move'}
            </Button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
