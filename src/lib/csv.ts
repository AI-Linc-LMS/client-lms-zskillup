/**
 * CSV cells for every client-side spreadsheet export (assessment results, the TPO
 * student / company-readiness reports, the admin + superadmin user-information
 * reports).
 *
 * Every cell is quoted with inner quotes doubled, and a STRING that begins with
 * = + - @, a tab or a carriage return gets a leading tab. Excel and Sheets EXECUTE a
 * cell that starts with a formula character, and names, colleges and phone numbers
 * are typed by students - `=HYPERLINK(...)` in a name must not become a live link in
 * whatever the TPO opens. The tab makes the cell inert while keeping the original
 * characters visible. Mirrors the backend's csvCell (jobs/job-export.service.ts,
 * tpo/tpo-report.service.ts), except that a real NUMBER is never prefixed, so a
 * negative value stays numeric.
 */

/** UTF-8 byte-order mark - lets Excel on Windows read the file as UTF-8. */
export const CSV_BOM = String.fromCharCode(0xfeff);

export type CsvValue = string | number | null | undefined;

/** Leading characters a spreadsheet treats as the start of a formula. */
const FORMULA_START = /^[=+\-@\t\r]/;

/** One quoted, formula-injection-safe CSV cell. */
export function csvCell(value: CsvValue): string {
  const raw = value === null || value === undefined ? '' : String(value);
  const safe = typeof value === 'string' && FORMULA_START.test(raw) ? `\t${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Header row + data rows, every cell through {@link csvCell}, CRLF line endings.
 *  No BOM and no trailing newline - the caller prepends {@link CSV_BOM} on download. */
export function toCsv(headers: readonly string[], rows: readonly (readonly CsvValue[])[]): string {
  return [headers.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\r\n');
}
