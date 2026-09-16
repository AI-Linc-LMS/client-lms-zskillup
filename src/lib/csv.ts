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
 *  No BOM and no trailing newline - {@link downloadCsv} prepends {@link CSV_BOM}. */
export function toCsv(headers: readonly string[], rows: readonly (readonly CsvValue[])[]): string {
  return [headers.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\r\n');
}

/**
 * Hands a {@link toCsv} string to the browser as a download, BOM included.
 *
 * Lives here rather than being copy-pasted per page (the TPO reports and
 * company-readiness pages each had their own `BOM` + `download()`), so every export
 * shares one Excel-compatible encoding and one anchor lifecycle: the link is attached
 * to the document (Firefox ignores clicks on detached anchors) and the object URL is
 * revoked once the download has started.
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([CSV_BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A filename-safe slug for the scope an export covers ("All batches" -> "all-batches"). */
export function csvScopeSlug(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'all'
  );
}
