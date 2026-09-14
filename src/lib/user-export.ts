import type {
  AdminUserPaidFields,
  AdminUserReportRow,
  UserSheetRow,
} from '@/lib/api/admin';
import { branchShort } from '@/lib/branch';
import type { CsvValue } from '@/lib/csv';
import { formatDateIST, formatTimeIST } from '@/lib/format';
import {
  ACCESS_LABEL_TEXT,
  ADMIN_ROLE_LABEL,
  PAID_STATUS_TONE,
  USER_STATUS_TONE,
} from '@/lib/ui-maps';

/**
 * Spreadsheet rows for the user exports: the User Information report (admin + super
 * admin Reports pages) and the Super Admin live user sheet. Every timestamp is split
 * into an IST date column and an IST time column so a spreadsheet can sort and filter
 * on either; paid status is written exactly as the server computed it.
 */

export interface ExportTable {
  headers: string[];
  rows: CsvValue[][];
}

/** [date, time] in IST; a missing timestamp is `[missing, '']`. */
function istDateTimeCells(at: string | null, missing = ''): [string, string] {
  return at ? [formatDateIST(at), formatTimeIST(at)] : [missing, ''];
}

/** [Paid Status, Access, Paid Until]. A non-student (paidStatus null) is "N/A". */
function paidCells(p: AdminUserPaidFields): [string, string, string] {
  if (!p.paidStatus) return ['N/A', '', ''];
  return [
    PAID_STATUS_TONE[p.paidStatus].label,
    p.paidStatus === 'UNPAID' && p.accessLabel ? ACCESS_LABEL_TEXT[p.accessLabel] : '',
    p.paidStatus === 'PAID' ? (p.paidUntil ? formatDateIST(p.paidUntil) : 'No expiry') : '',
  ];
}

const PAID_HEADERS = ['Paid Status', 'Access', 'Paid Until (IST)'];

/**
 * The User Information report. The endpoint has no visibility flag: for a viewer who may
 * not see paid status every row simply carries null paid fields. So the paid columns are
 * written when the viewer is a Super Admin (always allowed - `paidAlwaysVisible`) or when
 * at least one row carries a paid status; otherwise they are left out rather than
 * exported as a column of blanks that reads as "unknown". Role and status stay the raw
 * enum values the report has always exported.
 */
export function userReportTable(
  rows: readonly AdminUserReportRow[],
  opts: { paidAlwaysVisible: boolean },
): ExportTable {
  const withPaid =
    opts.paidAlwaysVisible ||
    rows.some((r) => r.paidStatus !== null && r.paidStatus !== undefined);
  const headers = [
    'User ID',
    'Full Name',
    'Email',
    'Phone',
    'Role',
    'College Name',
    'Cohort',
    'Registration Date (IST)',
    'Registration Time (IST)',
    'Last Login Date (IST)',
    'Last Login Time (IST)',
    'Account Status',
    'Subscription Plan',
    'Subscription Status',
    ...(withPaid ? PAID_HEADERS : []),
  ];
  return {
    headers,
    rows: rows.map((r) => [
      r.id,
      r.fullName ?? '',
      r.email,
      r.phone ?? '',
      r.role,
      r.collegeName ?? '',
      r.cohortName ?? '',
      ...istDateTimeCells(r.createdAt),
      ...istDateTimeCells(r.lastLoginAt, 'Never'),
      r.status,
      r.subscriptionPlan,
      r.subscriptionStatus,
      ...(withPaid ? paidCells(r) : []),
    ]),
  };
}

/** The live user sheet, in the on-screen column order (+ verification, update time, id). */
export function userSheetTable(rows: readonly UserSheetRow[]): ExportTable {
  return {
    headers: [
      'Name',
      'Email',
      'Phone',
      'Role',
      'Status',
      'Email Verified',
      'College',
      'Cohort',
      'Department',
      'Registered Date (IST)',
      'Registered Time (IST)',
      'Last Login Date (IST)',
      'Last Login Time (IST)',
      ...PAID_HEADERS,
      'Last Updated (IST)',
      'User ID',
    ],
    rows: rows.map((r) => [
      r.fullName ?? '',
      r.email,
      r.phone ?? '',
      ADMIN_ROLE_LABEL[r.role] ?? r.role,
      USER_STATUS_TONE[r.status]?.label ?? r.status,
      r.isEmailVerified ? 'Yes' : 'No',
      r.collegeName ?? '',
      r.cohortName ?? '',
      branchShort(r.department),
      ...istDateTimeCells(r.createdAt),
      ...istDateTimeCells(r.lastLoginAt, 'Never'),
      ...paidCells(r),
      istDateTimeCells(r.updatedAt).join(', '),
      r.id,
    ]),
  };
}
