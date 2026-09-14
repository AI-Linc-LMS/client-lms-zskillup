import type {
  UserSheetExportFilters,
  UserSheetExportRecord,
  UserSheetResult,
  UserSheetRow,
} from '@/lib/api/admin';
import { ApiRequestError } from '@/lib/api/types';
import { filterSheetRows, hasActiveFilters, type SheetFilters } from './sheet-model';
import type { SheetFileFormat } from './sheet-file';

/**
 * The export flow of the live user sheet, with its I/O passed in (so it is testable
 * without a browser or a backend):
 *
 *   1. read a fresh full snapshot (audited server-side as a view, like any snapshot);
 *   2. apply the on-screen filters; no matching user = no file and no audit row;
 *   3. generate the file in the browser; a failure throws and nothing is recorded;
 *   4. only then record the export (POST /admin/user-sheet/exports) with the exact
 *      number of data rows in the file, its format and the filters that produced it.
 *
 * The file is never held back by step 4: by then the browser already has it. A failed
 * record is reported as `logged: 'failed'` for a quiet notice; a 404 means the backend
 * predates the endpoint and is reported as `logged: 'unsupported'`, which the page
 * does not surface.
 */

/** Longest value the server accepts per filter (UserSheetExportFilters). */
export const EXPORT_FILTER_MAX_LENGTH: Readonly<Record<keyof UserSheetExportFilters, number>> = {
  search: 200,
  role: 40,
  status: 40,
  paid: 20,
  college: 200,
};

/** At most `max` code points (the server's length rule), never splitting a character. */
function clip(value: string, max: number): string {
  const chars = Array.from(value);
  return chars.length > max ? chars.slice(0, max).join('') : value;
}

/**
 * The filters to record for an export: only the set ones, the search trimmed (as it is
 * applied), each value cut to the server's limit so a very long search (a long run of
 * repeated terms still matches) can never cost the audit row. Empty exactly when
 * {@link hasActiveFilters} is false.
 *
 * NUL characters, which the server rejects, never get this far: no stored value contains
 * one, so a search with a NUL matches nobody and the export stops as empty.
 */
export function exportAuditFilters(f: SheetFilters): UserSheetExportFilters {
  const out: UserSheetExportFilters = {};
  const put = (key: keyof UserSheetExportFilters, value: string) => {
    if (value) out[key] = clip(value, EXPORT_FILTER_MAX_LENGTH[key]);
  };
  put('search', f.search.trim());
  put('role', f.role);
  put('status', f.status);
  put('paid', f.paid);
  put('college', f.college);
  return out;
}

export interface SheetExportIo {
  /** A fresh full snapshot. */
  fetchSnapshot: () => Promise<UserSheetResult>;
  /** Generates and saves the file; resolves with its number of data rows. */
  saveFile: (
    rows: readonly UserSheetRow[],
    format: SheetFileFormat,
    meta: { serverTime: string; filtered: boolean },
  ) => Promise<number>;
  /** Records the export in the audit trail. */
  record: (entry: UserSheetExportRecord) => Promise<unknown>;
}

export type SheetExportOutcome =
  /** No user matched: no file was generated and nothing was recorded. */
  | { status: 'empty'; filtered: boolean }
  /**
   * The file was saved. logged: 'yes' - recorded; 'failed' - the record call failed;
   * 'unsupported' - the backend does not have the endpoint yet (404).
   */
  | { status: 'saved'; rowCount: number; logged: 'yes' | 'failed' | 'unsupported' };

/**
 * Runs one export. Rejects only when the snapshot or the file failed - in both cases
 * before anything was recorded.
 */
export async function runUserSheetExport(
  format: SheetFileFormat,
  filters: SheetFilters,
  io: SheetExportIo,
): Promise<SheetExportOutcome> {
  const snapshot = await io.fetchSnapshot();
  const filtered = hasActiveFilters(filters);
  const rows = filterSheetRows(snapshot.rows, filters);
  if (rows.length === 0) return { status: 'empty', filtered };

  const rowCount = await io.saveFile(rows, format, { serverTime: snapshot.serverTime, filtered });

  const auditFilters = exportAuditFilters(filters);
  const entry: UserSheetExportRecord = {
    format,
    rowCount,
    filtered,
    ...(filtered ? { filters: auditFilters } : {}),
    snapshotServerTime: snapshot.serverTime,
  };
  try {
    await io.record(entry);
    return { status: 'saved', rowCount, logged: 'yes' };
  } catch (err) {
    const unsupported = err instanceof ApiRequestError && err.status === 404;
    return { status: 'saved', rowCount, logged: unsupported ? 'unsupported' : 'failed' };
  }
}
