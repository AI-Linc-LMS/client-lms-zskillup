/**
 * Calendar arithmetic, hand-rolled.
 *
 * A date library would be one more dependency and a bundle cost for six functions that
 * are each three lines. All of them work in LOCAL time on purpose: a session at
 * 10:45 IST belongs on the 16th for a student in India, and doing this in UTC puts
 * anything after 5:30am on the wrong day for exactly the people this is for.
 */

export const startOfDay = (d: Date): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const endOfDay = (d: Date): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

export const startOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), 1);

export const endOfMonth = (d: Date): Date =>
  new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

export const addDays = (d: Date, n: number): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const addMonths = (d: Date, n: number): Date =>
  new Date(d.getFullYear(), d.getMonth() + n, 1);

/** Monday-first: the working week students actually think in. */
export const startOfWeek = (d: Date): Date => {
  const day = (d.getDay() + 6) % 7;
  return addDays(startOfDay(d), -day);
};

export const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * The 6x7 grid a month view needs, including the leading and trailing days that belong
 * to the neighbouring months. Always six rows so the grid does not jump height between
 * a 28-day February and a 31-day month starting on a Sunday.
 */
export function monthGrid(month: Date): Date[] {
  const first = startOfWeek(startOfMonth(month));
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

export const toInputDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
