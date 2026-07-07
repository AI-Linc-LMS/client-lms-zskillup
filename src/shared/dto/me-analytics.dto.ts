/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo. Change both together.
 *
 * Student-facing "performance vs participation" scatter — the same lens the TPO
 * sees for a cohort, but from the student's own seat: their dot among anonymized
 * peers in their college.
 */

export interface ScatterPoint {
  /** Practice accuracy %, 0–100 (the performance axis). */
  performance: number;
  /** Activity volume = practice + 3×mocks + 2×coding (the participation axis). */
  participation: number;
}

export interface PerformanceParticipationDto {
  /** The caller's own point (null only if they have no activity yet). */
  you: ScatterPoint | null;
  /** Anonymized points for the other students in the caller's college. */
  peers: ScatterPoint[];
  /** Total students considered (incl. the caller). */
  cohortSize: number;
  /** 'college' when peers are the caller's college; 'solo' when they have none. */
  scope: 'college' | 'solo';
}
