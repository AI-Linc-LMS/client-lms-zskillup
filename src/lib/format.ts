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

// --- India Standard Time (admin consoles) ------------------------------------

/**
 * Admin-console timestamps are always shown in India Standard Time, whatever clock the
 * viewer's machine runs on, and always spelled the same way:
 *
 *   formatDateIST              "14 Sep 2026"
 *   formatTimeIST              "12:04 pm IST"
 *   formatDateTimeIST          "14 Sep 2026, 12:04 pm IST"
 *   formatDateTimeSecondsIST   "14 Sep 2026, 12:04:05 pm IST"   (tooltips)
 *
 * A missing value reads "Never" (these are mostly last-login cells). The parts come
 * from Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata' }) and are assembled
 * here rather than taken from `format()`, because engines disagree on the month
 * abbreviation ("Sep" vs "Sept") and the day-period case ("pm" vs "PM").
 */
export const IST_TIME_ZONE = 'Asia/Kolkata';

/** What the IST formatters print for a missing (null / absent / unparseable) value. */
export const NEVER_LABEL = 'Never';

export type DateInput = string | number | Date | null | undefined;

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface IstParts {
  year: number;
  /** 1-12 */
  month: number;
  day: number;
  /** 0-23 */
  hour: number;
  minute: number;
  second: number;
}

let istFormatter: Intl.DateTimeFormat | null = null;

function toIstParts(value: DateInput): IstParts | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  istFormatter ??= new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  });
  const out: Record<string, number> = {};
  for (const part of istFormatter.formatToParts(date)) {
    if (part.type !== 'literal') out[part.type] = Number(part.value);
  }
  return {
    year: out.year,
    month: out.month,
    day: out.day,
    // Some engines print midnight as "24" even with h23.
    hour: (out.hour ?? 0) % 24,
    minute: out.minute ?? 0,
    second: out.second ?? 0,
  };
}

const pad2 = (n: number) => String(n).padStart(2, '0');

function istDate(p: IstParts): string {
  return `${p.day} ${MONTH_ABBR[p.month - 1]} ${p.year}`;
}

function istTime(p: IstParts, seconds: boolean): string {
  const hour12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
  const clock = `${hour12}:${pad2(p.minute)}${seconds ? `:${pad2(p.second)}` : ''}`;
  return `${clock} ${p.hour < 12 ? 'am' : 'pm'} IST`;
}

/** "14 Sep 2026" in IST; "Never" when missing. */
export function formatDateIST(value: DateInput): string {
  const p = toIstParts(value);
  return p ? istDate(p) : NEVER_LABEL;
}

/** "12:04 pm IST" (or "12:04:05 pm IST" with `seconds`); "Never" when missing. */
export function formatTimeIST(value: DateInput, opts: { seconds?: boolean } = {}): string {
  const p = toIstParts(value);
  return p ? istTime(p, opts.seconds === true) : NEVER_LABEL;
}

/** "14 Sep 2026, 12:04 pm IST"; "Never" when missing. */
export function formatDateTimeIST(value: DateInput, opts: { seconds?: boolean } = {}): string {
  const p = toIstParts(value);
  return p ? `${istDate(p)}, ${istTime(p, opts.seconds === true)}` : NEVER_LABEL;
}

/** "14 Sep 2026, 12:04:05 pm IST" - the exact timestamp, for tooltips. */
export function formatDateTimeSecondsIST(value: DateInput): string {
  return formatDateTimeIST(value, { seconds: true });
}

/** The IST calendar day as "2026-09-14" (file names, grouping); null when missing. */
export function istDateKey(value: DateInput): string | null {
  const p = toIstParts(value);
  return p ? `${p.year}-${pad2(p.month)}-${pad2(p.day)}` : null;
}

const DATE_INPUT = /^\d{4}-\d{2}-\d{2}$/;

/**
 * `<input type="date">` values ("YYYY-MM-DD", or null when cleared) → the inclusive
 * range of instants covering those IST calendar days, as ISO-8601 UTC strings:
 * from = 00:00:00.000 IST of `from`, to = 23:59:59.999 IST of `to`. IST has no DST, so
 * the +05:30 offset is exact. A malformed value is dropped (no bound) rather than sent.
 */
export function istDayRangeIso(
  from: string | null,
  to: string | null,
): { from?: string; to?: string } {
  const bound = (day: string | null, time: string): string | undefined => {
    if (!day || !DATE_INPUT.test(day)) return undefined;
    const at = new Date(`${day}T${time}+05:30`);
    return Number.isNaN(at.getTime()) ? undefined : at.toISOString();
  };
  return { from: bound(from, '00:00:00.000'), to: bound(to, '23:59:59.999') };
}
