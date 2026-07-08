/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at backend-repo/src/shared/dto/recommendations.dto.ts.
 *
 * Post-calibration, CSV-driven recommendations for the student dashboard. The
 * backend evaluates the rule set (Free/Paid lists) against the student's signals
 * and returns the ranked, resolved recommendations to render verbatim.
 */

export type RecoUserType = 'Free' | 'Paid';
export type RecoScoreBand = 'High' | 'Medium' | 'Low' | 'All';

export interface RecommendationDto {
  /** Stable key (category + sub-category + trigger). */
  id: string;
  category: string;
  subCategory: string;
  scoreBand: RecoScoreBand;
  /** Verbatim student-facing copy from the sheet. */
  message: string;
  /** Recommended Product label (e.g. "Company Course", "Section Bundle"). */
  product: string;
  /** Button label from the sheet (e.g. "Unlock Company Course"). */
  cta: string;
  /** Resolved destination for the CTA (shop / upgrade / company hub / …). */
  href: string;
  /** Analytics tag from the sheet. */
  businessObjective: string;
}

export interface RecommendationsResponseDto {
  userType: RecoUserType;
  calibrated: boolean;
  /** Calibration overall % (null until calibrated). */
  overall: number | null;
  band: RecoScoreBand | null;
  /** Single highest-priority "next best action". */
  best: RecommendationDto | null;
  /** Ranked recommendations (includes `best` first). */
  items: RecommendationDto[];
}
