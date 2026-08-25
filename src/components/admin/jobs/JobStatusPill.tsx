import { cn } from '@/lib/utils';
import { JobStatus } from '@/shared/enums';

/**
 * A posting's state, in the two dimensions it actually has.
 *
 * Publish state and lifecycle are separate columns and separate decisions, so they get
 * separate pills. Collapsing them into one label was the original mistake: "Published"
 * and "On hold" are both true of the same posting, and a single chip has to pick one
 * and mislead about the other.
 */
export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  [JobStatus.ACTIVE]: 'Active',
  [JobStatus.INACTIVE]: 'Inactive',
  [JobStatus.CLOSED]: 'Closed',
  [JobStatus.COMPLETED]: 'Completed',
  [JobStatus.ON_HOLD]: 'On hold',
};

const TONE: Record<JobStatus, string> = {
  [JobStatus.ACTIVE]: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  [JobStatus.INACTIVE]: 'bg-slate-50 text-slate-600 ring-slate-200',
  [JobStatus.CLOSED]: 'bg-slate-50 text-slate-600 ring-slate-200',
  [JobStatus.COMPLETED]: 'bg-sky-50 text-sky-700 ring-sky-200',
  [JobStatus.ON_HOLD]: 'bg-amber-50 text-amber-700 ring-amber-200',
};

export function JobStatusPill({ status }: { status: JobStatus }) {
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1',
        TONE[status],
      )}
    >
      {JOB_STATUS_LABEL[status]}
    </span>
  );
}

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
