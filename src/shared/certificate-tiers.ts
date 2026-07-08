/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at backend-repo/src/shared/certificate-tiers.ts.
 *
 * The 7 XP-based certificate tiers. Reaching a tier's XP unlocks a downloadable,
 * publicly-verifiable certificate. Ordered ascending by XP.
 */

export interface CertificateTier {
  /** 1-based rank (1 = first/lowest, 7 = highest). Also the visual "prestige" level. */
  tier: number;
  /** Stable slug used in URLs + as the DB key. */
  slug: string;
  /** Full certificate title. */
  name: string;
  /** Short name for chips/headers. */
  shortName: string;
  /** XP required to unlock. */
  xp: number;
  /** 2-letter code used in the certificate id (ZS-<code>-XXXXXXXX). */
  code: string;
  /** One line of award copy printed on the certificate. */
  tagline: string;
}

export const CERTIFICATE_TIERS: CertificateTier[] = [
  { tier: 1, slug: 'learning-foundations', name: 'Learning Foundations Certificate', shortName: 'Learning Foundations', xp: 1_500, code: 'LF', tagline: 'for building strong learning foundations' },
  { tier: 2, slug: 'learning-achievement', name: 'Learning Achievement Certificate', shortName: 'Learning Achievement', xp: 3_000, code: 'LA', tagline: 'for consistent learning achievement' },
  { tier: 3, slug: 'learning-excellence', name: 'Learning Excellence Certificate', shortName: 'Learning Excellence', xp: 5_000, code: 'LE', tagline: 'for outstanding learning excellence' },
  { tier: 4, slug: 'placement-readiness', name: 'Placement Readiness Certificate', shortName: 'Placement Readiness', xp: 10_000, code: 'PR', tagline: 'for demonstrating placement readiness' },
  { tier: 5, slug: 'placement-proficiency', name: 'Placement Proficiency Certificate', shortName: 'Placement Proficiency', xp: 25_000, code: 'PP', tagline: 'for proven placement proficiency' },
  { tier: 6, slug: 'placement-excellence', name: 'Placement Excellence Certificate', shortName: 'Placement Excellence', xp: 50_000, code: 'PE', tagline: 'for exceptional placement excellence' },
  { tier: 7, slug: 'placement-mastery', name: 'Placement Mastery Certificate', shortName: 'Placement Mastery', xp: 100_000, code: 'PM', tagline: 'for achieving complete placement mastery' },
];

export function tierBySlug(slug: string): CertificateTier | undefined {
  return CERTIFICATE_TIERS.find((t) => t.slug === slug);
}

export function tierByNumber(tier: number): CertificateTier | undefined {
  return CERTIFICATE_TIERS.find((t) => t.tier === tier);
}
