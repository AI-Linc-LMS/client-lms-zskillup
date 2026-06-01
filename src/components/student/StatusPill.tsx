import { cn } from '@/lib/utils';
import type { CourseStatus } from '@/lib/demo-data';

/**
 * Status pill — consistent everywhere (frontend/CLAUDE §7). Color is paired with
 * text (never color alone) for accessibility (FRONTEND_STANDARDS §6).
 */
const STYLES: Record<CourseStatus, string> = {
  'In progress': 'bg-sky-50 text-sky-700 border-sky-200',
  'Due soon': 'bg-amber-50 text-amber-700 border-amber-200',
  Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Overdue: 'bg-red-50 text-red-700 border-red-200',
};

export function StatusPill({ status }: { status: CourseStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        STYLES[status],
      )}
    >
      {status}
    </span>
  );
}
