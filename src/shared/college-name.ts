/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored at frontend-repo/src/shared/college-name.ts.
 *
 * ONE DEFINITION OF "THE SAME COLLEGE NAME".
 *
 * A college's name reaches us from several places — a directory row, a student's
 * free text at signup, a name typed at the pre-assessment gate — and those disagree
 * about capitals, punctuation, spacing and abbreviations. Left alone, each spelling
 * becomes its own entity: one college filled a dropdown with
 *
 *     Basaveshwar Engineering College (359)
 *     Basaveshwar engineering college (32)
 *     Basaveshwar Engineering college (11)
 *     BASAVESHWAR ENGINEERING COLLEGE (5)
 *     basaveshwar engineering college (2)
 *
 * which is one college listed five times, differing only in case.
 *
 * Everything that has to decide whether two names mean the same institution — the
 * fuzzy matcher, the admin filters, the reports — folds them through here, so that
 * judgement lives in exactly one place and cannot drift between the two repos.
 */

/** How students actually abbreviate. Expanded before anything is compared. */
const SYNONYMS: Record<string, string> = {
  clg: 'college',
  collg: 'college',
  collge: 'college',
  collage: 'college',
  colage: 'college',
  coll: 'college',
  clge: 'college',
  engg: 'engineering',
  engr: 'engineering',
  engnr: 'engineering',
  inst: 'institute',
  instt: 'institute',
  instit: 'institute',
  tech: 'technology',
  technlgy: 'technology',
  univ: 'university',
  uni: 'university',
  vishwavidyalaya: 'university',
  sci: 'science',
  scn: 'science',
  mgmt: 'management',
  natl: 'national',
  govt: 'government',
  dept: 'department',
};

/**
 * Case, punctuation, spacing and abbreviations folded away.
 *
 * Deliberately NOT a similarity measure: this only collapses ways of writing the
 * same words. Deciding that two DIFFERENT wordings mean one institution is the
 * matcher's job, and needs a much higher bar (college-matching.ts).
 */
export function normaliseCollegeName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => SYNONYMS[w] ?? w)
    .join(' ');
}

/**
 * The key two spellings share when they are the same name written differently.
 * Empty for a blank or punctuation-only value, which callers treat as "no college".
 */
export function collegeGroupKey(raw: string | null | undefined): string {
  return raw ? normaliseCollegeName(raw) : '';
}

/** 1 when a name carries both cases, i.e. someone wrote it rather than shouting or
 *  mumbling it. Used only to break ties between equally common spellings. */
function properlyCased(name: string): number {
  return /[a-z]/.test(name) && /[A-Z]/.test(name) ? 1 : 0;
}

/**
 * Collapse a list of typed names into one entry per college.
 *
 * The label shown is the spelling MOST people used — the majority is the best
 * evidence of the real name, and it keeps the label something an admin recognises
 * rather than a normalised string nobody wrote.
 *
 * Ties go to the spelling that looks like a written name: mixed case beats ALL CAPS
 * and all lowercase, which are how people type when they are not thinking about the
 * name. Alphabetical last, so the choice is stable between renders.
 */
export function groupCollegeNames<T>(
  items: readonly T[],
  nameOf: (item: T) => string | null | undefined,
): Array<{ key: string; label: string; count: number; spellings: number }> {
  const groups = new Map<string, Map<string, number>>();
  for (const item of items) {
    const name = nameOf(item);
    const key = collegeGroupKey(name);
    if (!key || !name) continue;
    const bySpelling = groups.get(key) ?? new Map<string, number>();
    bySpelling.set(name, (bySpelling.get(name) ?? 0) + 1);
    groups.set(key, bySpelling);
  }
  return [...groups.entries()]
    .map(([key, bySpelling]) => {
      const spellings = [...bySpelling.entries()].sort(
        (a, b) =>
          b[1] - a[1] || properlyCased(b[0]) - properlyCased(a[0]) || a[0].localeCompare(b[0]),
      );
      return {
        key,
        label: spellings[0][0],
        count: spellings.reduce((sum, [, n]) => sum + n, 0),
        spellings: spellings.length,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'en-IN', { sensitivity: 'base' }));
}
