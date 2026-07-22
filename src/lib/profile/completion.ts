import type { ApiMe } from '@/lib/api/me';

export interface ProfileCompletion {
  percent: number;
  missing: string[];
  complete: boolean;
}

/**
 * The 8 fields that make up a "complete" student profile - the single source of
 * truth mirrored by the profile page, the dashboard completion banner and the
 * feature lock gate (name, phone, course, year, college, passout year, skills,
 * target roles). Non-students (e.g. an admin previewing the student app) are
 * never considered incomplete, so they're never gated.
 */
export function profileCompletion(me: ApiMe | null): ProfileCompletion {
  if (!me || me.role !== 'STUDENT') return { percent: 100, missing: [], complete: true };
  const p = me.studentProfile;
  const fields: Array<[string, boolean]> = [
    ['name', !!me.fullName?.trim()],
    ['phone', !!p?.phone],
    ['course', !!p?.course],
    ['year of study', !!p?.yearOfStudy],
    ['college', !!p?.collegeName],
    ['passout year', !!p?.passoutYear],
    ['skills', !!p?.skills?.length],
    ['target roles', !!p?.rolesInterested?.length],
  ];
  const filled = fields.filter(([, ok]) => ok).length;
  const percent = Math.round((filled / fields.length) * 100);
  return {
    percent,
    missing: fields.filter(([, ok]) => !ok).map(([label]) => label),
    complete: percent >= 100,
  };
}
