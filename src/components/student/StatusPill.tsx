import { cn } from '@/lib/utils';
import type { CourseStatus } from '@/lib/demo-data';

/**
 * Status pill — consistent everywhere (frontend/CLAUDE §4.11). Color is paired
 * with text (never color alone) for accessibility (FRONTEND_STANDARDS §6).
 *
 * Two ways to use it:
 *   - `status` — the canonical course-status labels (closed map below).
 *   - `tone` + `label` — any other domain state (mock outcomes, invites, …)
 *     rendered with the same §4.11 treatments, so no surface ever hand-rolls
 *     status styles.
 */
const STYLES: Record<CourseStatus, string> = {
  'In progress': 'bg-sky-50 text-sky-700 border-sky-200',
  'Due soon': 'bg-amber-50 text-amber-700 border-amber-200',
  Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Overdue: 'bg-red-50 text-red-700 border-red-200',
};

export type StatusTone = 'info' | 'warning' | 'positive' | 'negative' | 'neutral';

const TONE_STYLES: Record<StatusTone, string> = {
  info: 'bg-sky-50 text-sky-700 border-sky-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  positive: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  negative: 'bg-red-50 text-red-700 border-red-200',
  neutral: 'bg-slate-50 text-slate-600 border-slate-200',
};

type StatusPillProps =
  | { status: CourseStatus; tone?: never; label?: never }
  | { status?: never; tone: StatusTone; label: string };

export function StatusPill(props: StatusPillProps) {
  const className = props.status ? STYLES[props.status] : TONE_STYLES[props.tone];
  const text = props.status ?? props.label;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        className,
      )}
    >
      {text}
    </span>
  );
}
