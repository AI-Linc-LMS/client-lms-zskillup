/**
 * Shared display formatters - ONE definition each (no per-component copies).
 */

/** "11 Jun 2026" (or "11 Jun" with `year: false`); em-dash for missing dates. */
export function formatDateIN(iso: string | null, opts: { year?: boolean } = {}): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    ...(opts.year === false ? {} : { year: 'numeric' }),
  });
}

/** "4m 32s" / "45s" - elapsed-time style used by session summaries and reports. */
export function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/** "07:05" - countdown style used by the mock timer. */
export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
