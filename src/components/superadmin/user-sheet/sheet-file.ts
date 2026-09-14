import type { UserSheetRow } from '@/lib/api/admin';
import { CSV_BOM, toCsv } from '@/lib/csv';
import { IST_TIME_ZONE, istDateKey } from '@/lib/format';
import { userSheetTable } from '@/lib/user-export';

/**
 * Saves the user sheet as CSV or Excel in the browser. The column set comes from
 * lib/user-export. The CSV goes through lib/csv (quoted, formula-injection safe, BOM for
 * Excel on Windows). The xlsx writer stores strings as text cells and never emits a
 * formula, so a name typed as "=HYPERLINK(...)" opens as literal text; the library is
 * loaded only when an Excel export is asked for.
 */

export type SheetFileFormat = 'csv' | 'xlsx';

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** "user-sheet-2026-09-14-1204-IST" from the server time of the snapshot being saved. */
function baseName(serverTime: string, filtered: boolean): string {
  const at = new Date(serverTime);
  const day = istDateKey(at) ?? 'export';
  const hhmm = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .format(at)
    .replace(':', '');
  return `user-sheet${filtered ? '-filtered' : ''}-${day}-${hhmm}-IST`;
}

/**
 * Builds the file and hands it to the browser as a download. Resolves with the number of
 * DATA rows in the file (the header row excluded) - the count an export audit records;
 * rejects when the file could not be generated (e.g. the Excel writer failed to load).
 */
export async function saveUserSheet(
  rows: readonly UserSheetRow[],
  format: SheetFileFormat,
  meta: { serverTime: string; filtered: boolean },
): Promise<number> {
  const table = userSheetTable(rows);
  const name = baseName(meta.serverTime, meta.filtered);
  if (format === 'csv') {
    const csv = CSV_BOM + toCsv(table.headers, table.rows);
    saveBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${name}.csv`);
    return table.rows.length;
  }
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.aoa_to_sheet([
    table.headers,
    ...table.rows.map((r) => r.map((v) => (v === null || v === undefined ? '' : v))),
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Users');
  XLSX.writeFile(wb, `${name}.xlsx`);
  return table.rows.length;
}
