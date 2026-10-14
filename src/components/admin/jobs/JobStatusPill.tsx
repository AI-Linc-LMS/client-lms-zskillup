import { cn } from '@/lib/utils';
import { JobStatus } from '@/shared/enums';
import { DRIVE_STATUS_LABELS } from '@/shared/drive-lifecycle';

/**
 * A posting's state, in the two dimensions it actually has.
 *
 * Publish state and lifecycle are separate columns and separate decisions, so they get
 * separate pills. Collapsing them into one label was the original mistake: "Published"
 * and "On hold" are both true of the same posting, and a single chip has to pick one
 * and mislead about the other.
 *
 * The labels now come from the shared lifecycle contract (PRD §5) rather than a copy
 * here, so the admin list, the composer dropdown and the backend's error messages cannot
 * drift into calling the same status three different things.
 */
export const JOB_STATUS_LABEL = DRIVE_STATUS_LABELS;

/**
 * Colour says where a drive is in its life, not whether it is "good".
 *
 * Slate = not live yet. Emerald = open and taking applications. Sky = hiring underway.
 * Amber = paused, which is the one an operator needs to spot in a long list. Red is
 * reserved for cancelled: it is the only status that undoes work people have already
 * done, and it should not look like an ordinary ending.
 */
const TONE: Record<JobStatus, string> = {
  [JobStatus.DRAFT]: 'bg-slate-50 text-slate-600 ring-slate-200',
  [JobStatus.PENDING_APPROVAL]: 'bg-violet-50 text-violet-700 ring-violet-200',
  [JobStatus.READY_TO_PUBLISH]: 'bg-violet-50 text-violet-700 ring-violet-200',
  [JobStatus.PUBLISHED]: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  [JobStatus.ON_HOLD]: 'bg-amber-50 text-amber-700 ring-amber-200',
  [JobStatus.IN_PROGRESS]: 'bg-sky-50 text-sky-700 ring-sky-200',
  [JobStatus.SHORTLISTING]: 'bg-sky-50 text-sky-700 ring-sky-200',
  [JobStatus.INTERVIEWING]: 'bg-sky-50 text-sky-700 ring-sky-200',
  [JobStatus.OFFER_STAGE]: 'bg-sky-50 text-sky-700 ring-sky-200',
  [JobStatus.CLOSED]: 'bg-slate-50 text-slate-600 ring-slate-200',
  [JobStatus.COMPLETED]: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  [JobStatus.CANCELLED]: 'bg-red-50 text-red-700 ring-red-200',
  [JobStatus.ARCHIVED]: 'bg-slate-50 text-slate-500 ring-slate-200',
};

export function JobStatusPill({ status }: { status: JobStatus }) {
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1',
        TONE[status] ?? TONE[JobStatus.DRAFT],
      )}
    >
      {JOB_STATUS_LABEL[status] ?? status}
    </span>
  );
}

/**
 * Whether the posting is on the board at all — the OTHER dimension.
 *
 * Kept separate from the lifecycle pill above because publish state and lifecycle are
 * separate columns and separate decisions: a drive can be Shortlisting and unpublished,
 * and one chip cannot say both without misleading about one of them.
 */
export function PublishPill({ published }: { published: boolean }) {
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1',
        published
          ? 'bg-navy text-white ring-navy'
          : 'bg-slate-100 text-slate-500 ring-slate-200',
      )}
    >
      {published ? 'Published' : 'Draft'}
    </span>
  );
}
