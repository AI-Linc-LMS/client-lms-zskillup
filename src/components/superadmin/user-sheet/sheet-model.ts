import type { UserSheetResult, UserSheetRow } from '@/lib/api/admin';
import { branchShort } from '@/lib/branch';

/**
 * Pure data model of the live user sheet: applying a server read to the rows on screen,
 * and the client-side filters. No React, no I/O.
 *
 * Row objects are REUSED whenever the server sends a row whose values are unchanged. The
 * delta protocol re-sends every recently changed row for about two minutes (the server's
 * look-back window), so without this a single change would re-render - and flash - its
 * row on every poll. With it, a memoised table row re-renders only when its data really
 * changed, and a poll that changed nothing returns the very same array.
 */

export interface ApplyOutcome {
  rows: UserSheetRow[];
  /** Existing users whose displayed data changed. */
  changed: string[];
  /** Users that were not on screen before. */
  added: string[];
  /** Users that left the sheet (deleted). */
  removed: string[];
}

/** Field-by-field equality of two sheet rows (flat, primitive values only). */
export function sameRow(a: UserSheetRow, b: UserSheetRow): boolean {
  if (a === b) return true;
  const ra = a as unknown as Record<string, unknown>;
  const rb = b as unknown as Record<string, unknown>;
  const keys = Object.keys(rb);
  if (Object.keys(ra).length !== keys.length) return false;
  for (const k of keys) if (ra[k] !== rb[k]) return false;
  return true;
}

/** The server's order: newest registration first, then id. */
export function compareSheetRows(a: UserSheetRow, b: UserSheetRow): number {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * A full snapshot replaces the sheet. `prev` null = the first load (nothing is reported
 * as changed/added). Unchanged rows keep their previous object.
 */
export function applyFull(prev: readonly UserSheetRow[] | null, incoming: readonly UserSheetRow[]): ApplyOutcome {
  const prevById = new Map((prev ?? []).map((r) => [r.id, r] as const));
  const seen = new Set<string>();
  const rows: UserSheetRow[] = [];
  const changed: string[] = [];
  const added: string[] = [];
  for (const r of incoming) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    const old = prevById.get(r.id);
    if (old && sameRow(old, r)) {
      rows.push(old);
    } else {
      rows.push(r);
      if (old) changed.push(r.id);
      else if (prev) added.push(r.id);
    }
  }
  const removed = prev ? prev.filter((r) => !seen.has(r.id)).map((r) => r.id) : [];
  return { rows, changed, added, removed };
}

/**
 * A delta: upsert `rows` by id (the last copy of a repeated id wins) and drop
 * `removedIds`. A removed id that is also present in `rows` stays - the rows describe
 * the live state of the same read. Returns `prev` itself when nothing changed.
 */
export function applyDelta(prev: readonly UserSheetRow[], delta: Pick<UserSheetResult, 'rows' | 'removedIds'>): ApplyOutcome {
  const incoming = new Map<string, UserSheetRow>();
  for (const r of delta.rows) incoming.set(r.id, r);
  const removedIds = new Set(delta.removedIds);

  const rows: UserSheetRow[] = [];
  const changed: string[] = [];
  const removed: string[] = [];
  for (const old of prev) {
    const next = incoming.get(old.id);
    if (next) {
      incoming.delete(old.id);
      if (sameRow(old, next)) rows.push(old);
      else {
        rows.push(next);
        changed.push(old.id);
      }
    } else if (removedIds.has(old.id)) {
      removed.push(old.id);
    } else {
      rows.push(old);
    }
  }

  const added = [...incoming.keys()];
  if (added.length === 0 && changed.length === 0 && removed.length === 0) {
    return { rows: prev as UserSheetRow[], changed, added, removed };
  }
  if (added.length > 0) {
    rows.push(...incoming.values());
    rows.sort(compareSheetRows);
  }
  return { rows, changed, added, removed };
}

// --- Filters ---------------------------------------------------------------------

/** Paid filter: the two statuses, the two unpaid access reasons, or not applicable (staff). */
export type SheetPaidFilter = '' | 'PAID' | 'UNPAID' | 'COLLEGE_ACCESS' | 'COMPLIMENTARY' | 'NA';

/** College filter value for users with no college. */
export const NO_COLLEGE = '__none__';

export interface SheetFilters {
  search: string;
  role: string;
  status: string;
  paid: SheetPaidFilter;
  college: string;
}

export const EMPTY_FILTERS: SheetFilters = { search: '', role: '', status: '', paid: '', college: '' };

/** Lower-cased searchable text per row object (rows are reused, so this caches well). */
const haystacks = new WeakMap<UserSheetRow, string>();

function haystack(r: UserSheetRow): string {
  let h = haystacks.get(r);
  if (h === undefined) {
    h = [r.fullName, r.email, r.phone, r.collegeName, r.cohortName, branchShort(r.department)]
      .filter(Boolean)
      .join('\n')
      .toLowerCase();
    haystacks.set(r, h);
  }
  return h;
}

function matchesPaid(r: UserSheetRow, paid: SheetPaidFilter): boolean {
  switch (paid) {
    case '':
      return true;
    case 'PAID':
    case 'UNPAID':
      return r.paidStatus === paid;
    case 'COLLEGE_ACCESS':
    case 'COMPLIMENTARY':
      return r.paidStatus === 'UNPAID' && r.accessLabel === paid;
    case 'NA':
      return r.paidStatus === null;
  }
}

export function hasActiveFilters(f: SheetFilters): boolean {
  return Boolean(f.search.trim() || f.role || f.status || f.paid || f.college);
}

/** Rows matching every filter; the same array when no filter is set. */
export function filterSheetRows(rows: readonly UserSheetRow[], f: SheetFilters): readonly UserSheetRow[] {
  if (!hasActiveFilters(f)) return rows;
  const terms = f.search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter(
    (r) =>
      (!f.role || r.role === f.role) &&
      (!f.status || r.status === f.status) &&
      matchesPaid(r, f.paid) &&
      (!f.college || (f.college === NO_COLLEGE ? !r.collegeName : r.collegeName === f.college)) &&
      (terms.length === 0 || terms.every((t) => haystack(r).includes(t))),
  );
}

/** Distinct college names on the sheet, alphabetical, with how many users each has. */
export function collegeOptions(rows: readonly UserSheetRow[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of rows) if (r.collegeName) counts.set(r.collegeName, (counts.get(r.collegeName) ?? 0) + 1);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en-IN', { sensitivity: 'base' }));
}
