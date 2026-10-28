/**
 * Where a promotional banner can appear.
 *
 * Shared and byte-identical in both repos (ADR-011): the backend validates writes
 * against this list and the frontend renders the admin picker and the slots from it.
 * A placement that exists in one repo only is either an unreachable option in the
 * admin or a slot nothing can ever fill.
 *
 * The brief's requirement is "different banners for different modules instead of
 * showing the same banner everywhere", so placement is REQUIRED on every banner —
 * there is deliberately no "all pages" value. A campaign that genuinely belongs
 * everywhere is N rows, which is also what makes it measurable per module.
 */
export const PROMO_PLACEMENTS = [
  { key: 'PUBLIC_HOME', label: 'Public — home & marketing', group: 'Public (SEO)' },
  { key: 'PUBLIC_COMPANY', label: 'Public — company pages', group: 'Public (SEO)' },
  { key: 'PUBLIC_SECTION', label: 'Public — section pages', group: 'Public (SEO)' },
  { key: 'PUBLIC_JOBS', label: 'Public — job board', group: 'Public (SEO)' },
  { key: 'DASHBOARD', label: 'Student dashboard', group: 'Student' },
  { key: 'PRACTICE', label: 'Practice', group: 'Student' },
  { key: 'MOCK_ASSESSMENT', label: 'Mock assessments', group: 'Student' },
  { key: 'COMPANY_HUB', label: 'Company hub', group: 'Student' },
  { key: 'STUDY_PLAN', label: 'Study plan', group: 'Student' },
  { key: 'LIVE_SESSIONS', label: 'Live sessions', group: 'Student' },
  { key: 'MOCK_INTERVIEW', label: 'Mock interviews', group: 'Student' },
  { key: 'RESUME', label: 'Resume builder', group: 'Student' },
  { key: 'PLACEMENT_READINESS', label: 'Placement readiness', group: 'Student' },
  { key: 'LEADERBOARD', label: 'Leaderboard', group: 'Student' },
  { key: 'COMMUNITY', label: 'Community', group: 'Student' },
  { key: 'SHOP', label: 'Shop & explore', group: 'Student' },
] as const;

export type PromoPlacement = (typeof PROMO_PLACEMENTS)[number]['key'];

export const PROMO_PLACEMENT_KEYS: PromoPlacement[] = PROMO_PLACEMENTS.map((p) => p.key);

export function isPromoPlacement(value: string): value is PromoPlacement {
  return (PROMO_PLACEMENT_KEYS as string[]).includes(value);
}

/**
 * Is this banner live at `now`?
 *
 * Shared because the admin list and the public read must agree on what "scheduled"
 * means. Both bounds are optional: no start = live immediately, no end = runs until
 * switched off. `startsAt` is inclusive and `endsAt` is EXCLUSIVE, so an operator
 * setting end = the next campaign's start does not get one instant where both show.
 */
export function isPromoLive(
  b: { isActive: boolean; startsAt: Date | string | null; endsAt: Date | string | null },
  now: Date,
): boolean {
  if (!b.isActive) return false;
  const t = now.getTime();
  if (b.startsAt && new Date(b.startsAt).getTime() > t) return false;
  if (b.endsAt && new Date(b.endsAt).getTime() <= t) return false;
  return true;
}
