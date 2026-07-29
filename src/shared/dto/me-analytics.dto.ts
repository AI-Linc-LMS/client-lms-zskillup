/**
 * SHARED CONTRACT - DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo. Change both together.
 *
 * Student-facing "performance vs participation" scatter - the same lens the TPO
 * sees for a cohort, but from the student's own seat: their dot among anonymized
 * peers in their college.
 */

export interface ScatterPoint {
  /** Practice accuracy %, 0–100 (the performance axis). */
  performance: number;
  /** Activity volume = practice + 3×mocks + 2×coding (the participation axis). */
  participation: number;
}

/** A cohort in the caller's college — a B2B cohort-filter option. */
export interface CohortOption {
  id: string;
  name: string;
}

/** A company the caller's college has purchased — a B2B company-filter option. */
export interface CompanyOption {
  slug: string;
  name: string;
}

export interface PerformanceParticipationDto {
  /** The caller's own point (null only if they have no activity yet). */
  you: ScatterPoint | null;
  /** Anonymized points for the peer students shown (active students only). */
  peers: ScatterPoint[];
  /** Total students plotted (peers + the caller). */
  cohortSize: number;
  /** 'college' when peers are the caller's college; 'platform' when widened to everyone. */
  scope: 'college' | 'platform';
  /** B2B (college) only: cohorts in the caller's college, for the cohort filter. Omitted for B2C. */
  cohorts?: CohortOption[];
  /** B2B only: companies the college has purchased, for the company filter. Omitted for B2C. */
  companies?: CompanyOption[];
  /** Echo of the applied cohort filter (null = all cohorts). */
  appliedCohortId?: string | null;
  /** Echo of the applied company filter (null = all companies). */
  appliedCompanySlug?: string | null;
}
