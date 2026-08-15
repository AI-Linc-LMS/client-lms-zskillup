import type { ApiMe } from '@/lib/api/me';

export interface ProfileCompletion {
  /** 0-100 across all 8 profile fields - drives the completion banner + the
   *  profile-page checklist ("how finished is my profile?"). */
  percent: number;
  missing: string[];
  complete: boolean;
  /** Whether the ESSENTIALS are on file. This - not `complete` - is what unlocks
   *  the gated feature surfaces (see ESSENTIAL_FIELDS below). */
  essentialsComplete: boolean;
  /** Which essentials are still missing, for the "still needed" line on the lock card. */
  essentialsMissing: string[];
}

/**
 * The 3 fields a student must have on file before the gated surfaces
 * (/practice, /mock-assessment, /assessments) open up: their name, a phone
 * number, and a college.
 *
 * WHY THIS IS A SUBSET, NOT ALL 8 (changed 2026-08-14): the gate used to demand
 * a 100%-complete profile, and the only flow that ever filled 7 of those 8
 * fields in one pass was the 4-step onboarding wizard. That wizard is no longer
 * routed to on sign-in or signup (product decision - students land on the
 * dashboard), so an un-onboarded student is now the NORMAL case, and a 8/8 bar
 * would have walled every student out of the three core practice surfaces on
 * their first click - relocating the wizard's friction rather than removing it.
 * The remaining 5 fields (course, year of study, passout year, skills, target
 * roles) are still asked for by the dashboard banner + the profile checklist,
 * which keep scoring out of 8; they just no longer block the product.
 */
/**
 * Profile completeness NEVER blocks a feature. It is a nudge, not a gate.
 *
 * Colleges enrol students in bulk by CSV, and that importer captures roll number,
 * branch and college - there is no phone column (auth.service captureInviteProfile).
 * So every bulk-enrolled student lands with no phone on file, and ANY profile gate
 * walls an entire cohort out of the assessments their college has already paid for.
 * That is the opposite of what a paid seat should feel like on day one.
 *
 * Set this back to true only if the enrolment paths that create students are ALSO
 * changed to collect whatever the gate demands - otherwise you are locking out the
 * exact users who cost the most to acquire. Everything below still computes, so the
 * dashboard banner and the /profile checklist keep asking; they just never block.
 */
export const PROFILE_GATE_ENABLED = false;

const ESSENTIAL_FIELDS = new Set(['name', 'phone', 'college']);

/**
 * The 8 fields that make up a "complete" student profile - the single source of
 * truth mirrored by the profile page, the dashboard completion banner and the
 * feature lock gate (name, phone, course, year, college, passout year, skills,
 * target roles). Non-students (e.g. an admin previewing the student app) are
 * never considered incomplete, so they're never gated.
 */
export function profileCompletion(me: ApiMe | null): ProfileCompletion {
  if (!me || me.role !== 'STUDENT') {
    return { percent: 100, missing: [], complete: true, essentialsComplete: true, essentialsMissing: [] };
  }
  const p = me.studentProfile;
  const fields: Array<[string, boolean]> = [
    ['name', !!me.fullName?.trim()],
    ['phone', !!p?.phone],
    ['course', !!p?.course],
    ['year of study', !!p?.yearOfStudy],
    // A college the platform already knows about counts even when the free-text
    // name was never denormalised onto the profile (TPO CSV import writes the FK
    // only). Without this, a student whose college was assigned FOR them scored
    // "college: missing" and stayed locked out of a college they're enrolled in.
    ['college', !!p?.collegeName || !!p?.collegeId || !!me.collegeId],
    ['passout year', !!p?.passoutYear],
    ['skills', !!p?.skills?.length],
    ['target roles', !!p?.rolesInterested?.length],
  ];
  const filled = fields.filter(([, ok]) => ok).length;
  const percent = Math.round((filled / fields.length) * 100);
  const essentialsMissing = fields
    .filter(([label, ok]) => !ok && ESSENTIAL_FIELDS.has(label))
    .map(([label]) => label);
  return {
    percent,
    missing: fields.filter(([, ok]) => !ok).map(([label]) => label),
    complete: percent >= 100,
    essentialsComplete: essentialsMissing.length === 0,
    essentialsMissing,
  };
}
