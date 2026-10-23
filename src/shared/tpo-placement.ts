/**
 * SHARED CONTRACT — DUPLICATED BYTE-FOR-BYTE ACROSS BOTH REPOS (ADR-011).
 *
 * THE TPO'S PLACEMENT VIEW (additional requirement 1).
 *
 * The PMS has extensive admin functionality and the product is meant to solve placement
 * operations FOR TPOs — who, until this, could not see a job drive at all. Everything the
 * TPO console showed was assessment and readiness data; the entire placement pipeline, the
 * thing a placement office actually does, was admin-only.
 *
 * COUNTS ARE OF APPLICATIONS, EXCEPT WHERE THEY SAY STUDENTS. A student in three drives is
 * three applications and one student, and a placement office asks both questions in the
 * same conversation ("how many applications went out" / "how many of our students are
 * placed"). Collapsing them into one number makes every rate ambiguous.
 *
 * EVERY RATE CARRIES ITS DENOMINATOR, as §14 requires. "68%" of seventeen is a different
 * claim from "68%" of nine hundred and the number alone cannot say which.
 */

/** The counters on the TPO dashboard. Each is scoped to the TPO's own college. */
export interface TpoDrivePipelineSummary {
  /** Students of this college, the denominator for every rate below. */
  totalStudents: number;
  /** Drives currently open to this college. */
  activeDrives: number;
  /** Open to this college, not yet opened for applications. */
  upcomingDrives: number;
  applicationsSubmitted: number;
  /** Distinct students who have applied to at least one drive. */
  studentsApplied: number;
  /** Passing hard eligibility on at least one live drive. */
  eligibleStudents: number;
  shortlistedStudents: number;
  inRoundsStudents: number;
  offersReceived: number;
  offersAccepted: number;
  joined: number;
  /**
   * Placed, by the strictest of the three milestones that is still honest to quote.
   *
   * Deliberately NOT a single "placement rate": §14 forbids one, because offer received,
   * accepted and joined are three different claims and a single number lets whoever
   * quotes it pick the flattering one without saying so.
   */
  placementRate: { offered: RateWithDenominator; accepted: RateWithDenominator; joined: RateWithDenominator };
  recentActivity: TpoActivityItem[];
}

export interface RateWithDenominator {
  count: number;
  of: number;
  /** Null when `of` is zero — "no data" is not "0%". Nobody applying yet is not
   *  everybody failing, and a 0% on a dashboard gets read as the latter. */
  pct: number | null;
}

export interface TpoActivityItem {
  at: string;
  studentName: string | null;
  driveTitle: string;
  companyName: string | null;
  stage: string;
  stageLabel: string;
}

/**
 * Why a drive appears in a TPO's list.
 *
 * Mirrors the flag the assessment reports already use. Without it the dashboard counts
 * every application this college's students made, while the list shows only the drives
 * targeting the college — so the totals do not add up and a TPO reasonably asks where
 * the rest went.
 */
export type TpoDriveScope = 'OWN' | 'ATTEMPTED';

/** One drive as the TPO's list shows it. */
export interface TpoDriveRow {
  id: string;
  /** OWN: targeted at this college. ATTEMPTED: not targeted, but our students applied. */
  scope: TpoDriveScope;
  title: string;
  companyName: string | null;
  status: string;
  applyBy: string | null;
  /** Students of THIS college only, at every count below. */
  eligible: number;
  applied: number;
  shortlisted: number;
  inRounds: number;
  selected: number;
  offers: number;
  joined: number;
  /** How many of this college's students have been evaluated for this drive at all.
   *  0 eligible of 0 evaluated is "not assessed yet"; 0 of 40 is "nobody qualifies". */
  evaluated: number;
  /** The furthest stage any of this college's students has reached on this drive. */
  currentRound: string | null;
}

export const TPO_DRIVE_PIPELINE_EMPTY: TpoDrivePipelineSummary = {
  totalStudents: 0,
  activeDrives: 0,
  upcomingDrives: 0,
  applicationsSubmitted: 0,
  studentsApplied: 0,
  eligibleStudents: 0,
  shortlistedStudents: 0,
  inRoundsStudents: 0,
  offersReceived: 0,
  offersAccepted: 0,
  joined: 0,
  placementRate: {
    offered: { count: 0, of: 0, pct: null },
    accepted: { count: 0, of: 0, pct: null },
    joined: { count: 0, of: 0, pct: null },
  },
  recentActivity: [],
};

/** A rate that refuses to divide by zero, and says so rather than printing 0%. */
export function rate(count: number, of: number): RateWithDenominator {
  return { count, of, pct: of > 0 ? Math.round((count / of) * 1000) / 10 : null };
}
