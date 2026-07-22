/**
 * SHARED CONTRACT - DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at backend-repo/src/shared/dto/certificate.dto.ts.
 *
 * XP-based certificates: the student's per-tier unlock/issue state, and the
 * public verification payload.
 */

/** One tier as seen by the signed-in student (unlock + issue state). */
export interface MyCertificateDto {
  tier: number;
  slug: string;
  name: string;
  shortName: string;
  xp: number;
  tagline: string;
  /** True when the student's total XP has reached this tier's threshold. */
  unlocked: boolean;
  /** True once a certificate record has been minted for this tier. */
  issued: boolean;
  /** The shareable, verifiable id (ZS-XX-XXXXXXXX) - present once issued. */
  certificateId: string | null;
  /** ISO issue date - present once issued. */
  issuedAt: string | null;
}

export interface MyCertificatesResponseDto {
  /** The student's current total XP. */
  totalXp: number;
  /** Name printed on newly-issued certificates. */
  holderName: string;
  /** All 7 tiers, ascending. */
  certificates: MyCertificateDto[];
}

/** The result of minting/opening a certificate the student qualifies for. */
export interface IssuedCertificateDto {
  certificateId: string;
  tier: number;
  slug: string;
  name: string;
  tagline: string;
  holderName: string;
  xpAtIssue: number;
  issuedAt: string;
}

/** Public verification payload (no auth) - for the share page + verify form. */
export interface CertificateVerifyDto {
  valid: boolean;
  certificateId: string;
  holderName?: string;
  tier?: number;
  slug?: string;
  name?: string;
  tagline?: string;
  xpAtIssue?: number;
  issuedAt?: string;
}
