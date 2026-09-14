import { StatusPill } from '@/components/student/StatusPill';
import type { AdminUserPaidFields, AdminUserStatus } from '@/lib/api/admin';
import {
  NEVER_LABEL,
  formatDateIST,
  formatDateTimeSecondsIST,
  formatTimeIST,
} from '@/lib/format';
import { ACCESS_LABEL_TEXT, PAID_STATUS_TONE, USER_STATUS_TONE } from '@/lib/ui-maps';

/**
 * Table cells shared by the admin users consoles and the Super Admin user sheet, so a
 * status, a last login and a paid status read the same on every surface. Presentational
 * only: every value is rendered as the backend computed it.
 */

/** Account status (§4.11 StatusPill). */
export function AccountStatusPill({ status }: { status: AdminUserStatus }) {
  const s = USER_STATUS_TONE[status] ?? { tone: 'neutral' as const, label: status };
  return <StatusPill tone={s.tone} label={s.label} />;
}

/** Date over time, both IST, with the exact timestamp (seconds) as the tooltip. */
export function DateTimeCell({ at, empty = NEVER_LABEL }: { at: string | null; empty?: string }) {
  if (!at) return <span className="text-xs text-slate-500">{empty}</span>;
  return (
    <time dateTime={at} title={formatDateTimeSecondsIST(at)} className="block whitespace-nowrap">
      <span className="block text-xs font-medium text-slate-700">{formatDateIST(at)}</span>
      <span className="block text-xs text-slate-500">{formatTimeIST(at)}</span>
    </time>
  );
}

/** One sentence describing a paid status - the tooltip and the screen-reader text. */
export function paidStatusDescription(p: AdminUserPaidFields): string {
  if (p.paidStatus === 'PAID') {
    return p.paidUntil ? `Paid till ${formatDateIST(p.paidUntil)}` : 'Paid, no expiry';
  }
  if (p.paidStatus === 'UNPAID') {
    return p.accessLabel
      ? `Unpaid, ${ACCESS_LABEL_TEXT[p.accessLabel].toLowerCase()}`
      : 'Unpaid, no active access';
  }
  return 'Not applicable (not a student account)';
}

/**
 * Paid / Unpaid pill with the access reason (College access / Complimentary) under it and
 * "Paid till <date>" as the tooltip. A non-student (paidStatus null) shows a quiet dash.
 */
export function PaidStatusCell(p: AdminUserPaidFields) {
  const description = paidStatusDescription(p);
  if (!p.paidStatus) {
    return (
      <span className="text-xs text-slate-500" title={description}>
        <span aria-hidden>-</span>
        <span className="sr-only">{description}</span>
      </span>
    );
  }
  const pill = PAID_STATUS_TONE[p.paidStatus];
  return (
    <span className="flex flex-col items-start gap-1" title={description}>
      {/* Visible pill + reason are hidden from assistive tech; the sentence below says
          the same thing in full, including the paid-until date the tooltip carries. */}
      <span aria-hidden className="contents">
        <StatusPill tone={pill.tone} label={pill.label} />
        {p.paidStatus === 'UNPAID' && p.accessLabel && (
          <span className="whitespace-nowrap text-[11px] text-slate-500">
            {ACCESS_LABEL_TEXT[p.accessLabel]}
          </span>
        )}
      </span>
      <span className="sr-only">{description}</span>
    </span>
  );
}
