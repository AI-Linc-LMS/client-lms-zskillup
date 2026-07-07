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
  /** Anonymized points for the peer students shown (active students only). */
  peers: ScatterPoint[];
  /** Total students plotted (peers + the caller). */
  cohortSize: number;
  /** 'college' when peers are the caller's college; 'platform' when widened to everyone. */
  scope: 'college' | 'platform';
}
