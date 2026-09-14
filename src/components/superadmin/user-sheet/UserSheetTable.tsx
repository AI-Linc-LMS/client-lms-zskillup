'use client';

import { memo } from 'react';
import type { UserSheetRow } from '@/lib/api/admin';
import { branchShort } from '@/lib/branch';
import { formatDateIST, formatDateTimeSecondsIST, formatTimeIST, NEVER_LABEL } from '@/lib/format';
import { ADMIN_ROLE_LABEL } from '@/lib/ui-maps';
import { cn } from '@/lib/utils';
import { AccountStatusPill, DateTimeCell, PaidStatusCell } from '@/components/superadmin/UserCells';

const TH = 'whitespace-nowrap px-3 py-3';
const TD = 'px-3 py-2.5 align-top';

const COLUMNS = [
  'Name',
  'Email',
  'Phone',
  'Role',
  'Status',
  'College',
  'Cohort',
  'Department',
  'Registered (IST)',
  'Last login date',
  'Last login time (IST)',
  'Paid',
] as const;

const Dash = () => (
  <span className="text-slate-500">
    <span aria-hidden>-</span>
    <span className="sr-only">Not set</span>
  </span>
);

/**
 * One sheet row. Memoised on the row OBJECT and its highlight flag: the sheet model
 * reuses the previous object for a row whose data did not change, so a background
 * refresh re-renders only the rows that really changed.
 */
const SheetRow = memo(function SheetRow({
  row,
  highlighted,
}: {
  row: UserSheetRow;
  highlighted: boolean;
}) {
  return (
    <tr
      className={cn(
        'transition-colors',
        highlighted ? 'bg-amber-50' : 'hover:bg-slate-50',
      )}
    >
      <td className={cn(TD, 'font-semibold text-navy')}>
        <span className="block max-w-[14rem] truncate" title={row.fullName ?? undefined}>
          {row.fullName ?? <Dash />}
        </span>
        {highlighted && <span className="sr-only"> (just updated)</span>}
      </td>
      <td className={cn(TD, 'text-xs text-slate-600')}>
        <span className="block max-w-[16rem] truncate" title={row.email}>
          {row.email}
        </span>
      </td>
      <td className={cn(TD, 'whitespace-nowrap text-xs tabular-nums text-slate-600')}>
        {row.phone ?? <Dash />}
      </td>
      <td className={cn(TD, 'whitespace-nowrap text-xs text-slate-600')}>
        {ADMIN_ROLE_LABEL[row.role] ?? row.role}
      </td>
      <td className={TD}>
        <AccountStatusPill status={row.status} />
      </td>
      <td className={cn(TD, 'text-xs text-slate-600')}>
        <span className="block max-w-[14rem] truncate" title={row.collegeName ?? undefined}>
          {row.collegeName ?? <Dash />}
        </span>
      </td>
      <td className={cn(TD, 'text-xs text-slate-600')}>
        <span className="block max-w-[10rem] truncate" title={row.cohortName ?? undefined}>
          {row.cohortName ?? <Dash />}
        </span>
      </td>
      <td className={cn(TD, 'whitespace-nowrap text-xs text-slate-600')}>
        {row.department ? branchShort(row.department) : <Dash />}
      </td>
      <td className={TD}>
        <DateTimeCell at={row.createdAt} empty="-" />
      </td>
      <td className={cn(TD, 'whitespace-nowrap text-xs')}>
        {row.lastLoginAt ? (
          <time
            dateTime={row.lastLoginAt}
            title={formatDateTimeSecondsIST(row.lastLoginAt)}
            className="font-medium text-slate-700"
          >
            {formatDateIST(row.lastLoginAt)}
          </time>
        ) : (
          <span className="text-slate-500">{NEVER_LABEL}</span>
        )}
      </td>
      <td className={cn(TD, 'whitespace-nowrap text-xs text-slate-500')}>
        {row.lastLoginAt ? (
          <span title={formatDateTimeSecondsIST(row.lastLoginAt)}>
            {formatTimeIST(row.lastLoginAt)}
          </span>
        ) : (
          <Dash />
        )}
      </td>
      <td className={TD}>
        <PaidStatusCell
          paidStatus={row.paidStatus}
          accessLabel={row.accessLabel}
          paidUntil={row.paidUntil}
        />
      </td>
    </tr>
  );
});

/** The visible page of the sheet (the parent slices; this renders at most one page). */
export function UserSheetTable({
  rows,
  highlighted,
  busy,
}: {
  rows: readonly UserSheetRow[];
  highlighted: ReadonlySet<string>;
  busy: boolean;
}) {
  return (
    <div className="overflow-x-auto" aria-busy={busy}>
      <table className="w-full min-w-[1320px] text-sm">
        <caption className="sr-only">
          All users, newest registration first. Timestamps are India Standard Time.
        </caption>
        <thead className="border-b border-slate-100 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          <tr>
            {COLUMNS.map((c) => (
              <th key={c} scope="col" className={TH}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <SheetRow key={row.id} row={row} highlighted={highlighted.has(row.id)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
