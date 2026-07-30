/**
 * Shared option sets for the academic profile fields (used by the profile editor
 * and the signup onboarding step). Year of study is a free-form category, not a
 * number - graduates / working professionals / "not applicable" students need an
 * option too. Values "1".."5" stay numeric-as-text for backward compatibility
 * with profiles created before year_of_study became a varchar (migration 077).
 */

export const YEAR_OF_STUDY_OPTIONS: { value: string; label: string }[] = [
  { value: '1', label: '1st year' },
  { value: '2', label: '2nd year' },
  { value: '3', label: '3rd year' },
  { value: '4', label: '4th year' },
  { value: '5', label: '5th year' },
  { value: 'Graduate', label: 'Graduate' },
  { value: 'Working professional', label: 'Working professional' },
  { value: 'Not applicable', label: 'Not applicable' },
];

/** Human label for a stored year-of-study value ("3" -> "3rd year", categories as-is). */
export const yearOfStudyLabel = (v: string): string =>
  YEAR_OF_STUDY_OPTIONS.find((o) => o.value === v)?.label ?? v;

/** Passout / expected-graduation year range: a few years back (already graduated)
 *  through several ahead (expected graduation). Blank stays allowed. */
export const PASSOUT_YEARS = Array.from({ length: 16 }, (_, i) => 2018 + i);

/** Common degrees for the Course/Degree dropdown. There is no literal "Other"
 *  option in THIS list — the UI adds an explicit "Other" choice that reveals a
 *  BLANK custom input (see the profile editor), so the student's real course is
 *  stored, never the word "Other". A stored course that isn't listed here is
 *  treated as an already-entered custom value. */
export const COURSE_OPTIONS = [
  'B.Tech', 'B.E.', 'B.Sc', 'BCA', 'B.Com', 'B.A', 'B.Arch', 'B.Pharm', 'BBA',
  'B.Tech CSE', 'B.Tech IT', 'B.Tech ECE', 'B.Tech EEE', 'B.Tech Mechanical', 'B.Tech Civil',
  'M.Tech', 'M.E.', 'M.Sc', 'MCA', 'M.Com', 'M.A', 'MBA', 'PhD', 'Diploma',
];
