/**
 * SHARED CONTRACT — DUPLICATED BYTE-FOR-BYTE ACROSS BOTH REPOS (ADR-011).
 *
 * WHERE A STUDENT STANDS ON PLACEMENT (PRD §7).
 *
 * The central design decision, taken from the PRD's own words: "Allow multiple offers per
 * student and distinguish offers received from accepted and actual joining." So an OFFER
 * is the record, a student can have many, and their current status is DERIVED from them
 * rather than stored as a second source of truth that can disagree with its own evidence.
 *
 * Three rules this file exists to enforce:
 *
 *   1. NOTHING IS OVERWRITTEN. "Do not overwrite historical records when a student's
 *      current status changes", and "Offer is rescinded, declined, or student does not
 *      join: update offer history and placement status without deleting the offer
 *      record." A declined offer stays a declined offer; it does not become an absence.
 *
 *   2. THE THREE MILESTONES STAY APART. Offer received, offer accepted and actually
 *      joined are different facts, and §14 insists reporting keep them separate: "'placed'
 *      must distinguish offer received, accepted and joined". Collapsing them is the
 *      easiest way to make a placement rate look better than it is.
 *
 *   3. A DECLARATION BEATS A DERIVATION. A student who says they are not seeking a job,
 *      or whose record a TPO has flagged for review, is not described by their offers.
 *      Those states are declared and they win, because the alternative is a system
 *      telling a student they are "unplaced" when they opted out.
 */

/** What happened to one offer. */
export enum OfferStatus {
  /** Extended by the employer, awaiting the student. */
  OFFERED = 'OFFERED',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  /** Accepted, and the student actually started. */
  JOINED = 'JOINED',
  /** Accepted, and then they did not start. */
  DID_NOT_JOIN = 'DID_NOT_JOIN',
  /** Withdrawn by the employer after being made. */
  RESCINDED = 'RESCINDED',
  /** Lapsed without an answer. */
  EXPIRED = 'EXPIRED',
}

/** What kind of offer it is. */
export enum OfferKind {
  FULL_TIME = 'FULL_TIME',
  INTERNSHIP = 'INTERNSHIP',
  /** An internship that converted, or was always intended to. */
  PPO = 'PPO',
  APPRENTICESHIP = 'APPRENTICESHIP',
}

/** The PRD's ten current-placement states (§7). */
export enum PlacementStatus {
  UNPLACED = 'UNPLACED',
  /** Has a live application somewhere, nothing decided. */
  IN_PROCESS = 'IN_PROCESS',
  OFFER_RECEIVED = 'OFFER_RECEIVED',
  /** Offer accepted — "placed" in the sense most people mean it. */
  PLACED = 'PLACED',
  /** Accepted AND started. */
  JOINED = 'JOINED',
  /** Placed via an internship or a pre-placement offer. */
  PPO_INTERNSHIP = 'PPO_INTERNSHIP',
  OFFER_DECLINED = 'OFFER_DECLINED',
  /** Declared by the student — higher studies, family business, anything. */
  NOT_SEEKING = 'NOT_SEEKING',
  WITHDRAWN = 'WITHDRAWN',
  /** Something does not add up and a human should look. */
  TO_BE_REVIEWED = 'TO_BE_REVIEWED',
}

export const PLACEMENT_STATUS_LABELS: Readonly<Record<PlacementStatus, string>> = {
  [PlacementStatus.UNPLACED]: 'Unplaced',
  [PlacementStatus.IN_PROCESS]: 'In process',
  [PlacementStatus.OFFER_RECEIVED]: 'Offer received',
  [PlacementStatus.PLACED]: 'Placed',
  [PlacementStatus.JOINED]: 'Joined',
  [PlacementStatus.PPO_INTERNSHIP]: 'PPO / internship',
  [PlacementStatus.OFFER_DECLINED]: 'Offer declined',
  [PlacementStatus.NOT_SEEKING]: 'Not seeking',
  [PlacementStatus.WITHDRAWN]: 'Withdrawn',
  [PlacementStatus.TO_BE_REVIEWED]: 'To be reviewed',
};

/** The states a student declares (or a TPO declares for them), which outrank any derivation. */
export const DECLARED_STATUSES: readonly PlacementStatus[] = [
  PlacementStatus.NOT_SEEKING,
  PlacementStatus.WITHDRAWN,
  PlacementStatus.TO_BE_REVIEWED,
] as const;

/** One offer, reduced to what deciding a current status needs. */
export interface OfferFacts {
  status: OfferStatus;
  kind: OfferKind;
  /** Annual CTC in rupees, when known. */
  ctc?: number | null;
  offerDate?: string | null;
}

/**
 * A student's current placement status, worked out from their offers.
 *
 * Ordered by how far along it is, and the FURTHEST one wins: a student holding a joined
 * offer and a declined one is joined, not declined. The alternative — latest-wins —
 * would let an unrelated rejection erase a job somebody already started.
 *
 * `declared` short-circuits everything, because a student who has opted out is not
 * described by the offers they happen to hold.
 */
export function derivePlacementStatus(
  offers: readonly OfferFacts[],
  opts: { declared?: PlacementStatus | null; hasLiveApplication?: boolean } = {},
): PlacementStatus {
  if (opts.declared && DECLARED_STATUSES.includes(opts.declared)) return opts.declared;

  const has = (s: OfferStatus) => offers.some((o) => o.status === s);

  if (has(OfferStatus.JOINED)) {
    // A joined internship or PPO is placed, but it is not the same fact as a full-time
    // hire and the PRD keeps them apart.
    const joined = offers.find((o) => o.status === OfferStatus.JOINED)!;
    return joined.kind === OfferKind.FULL_TIME
      ? PlacementStatus.JOINED
      : PlacementStatus.PPO_INTERNSHIP;
  }
  if (has(OfferStatus.ACCEPTED)) {
    const accepted = offers.find((o) => o.status === OfferStatus.ACCEPTED)!;
    return accepted.kind === OfferKind.FULL_TIME
      ? PlacementStatus.PLACED
      : PlacementStatus.PPO_INTERNSHIP;
  }
  if (has(OfferStatus.OFFERED)) return PlacementStatus.OFFER_RECEIVED;

  // Everything left is an offer that ended without a placement. The student is back in
  // the pool — but "declined" is worth saying out loud, because a placement team chases
  // those differently from someone who never got an offer.
  if (has(OfferStatus.DECLINED)) return PlacementStatus.OFFER_DECLINED;
  if (has(OfferStatus.DID_NOT_JOIN) || has(OfferStatus.RESCINDED) || has(OfferStatus.EXPIRED)) {
    // Accepted-then-fell-through needs a human: it is neither placed nor cleanly unplaced.
    return PlacementStatus.TO_BE_REVIEWED;
  }

  return opts.hasLiveApplication ? PlacementStatus.IN_PROCESS : PlacementStatus.UNPLACED;
}

/** Statuses that count as placed for the headline rate. */
export const PLACED_STATUSES: readonly PlacementStatus[] = [
  PlacementStatus.PLACED,
  PlacementStatus.JOINED,
  PlacementStatus.PPO_INTERNSHIP,
] as const;

export function isPlaced(status: PlacementStatus): boolean {
  return PLACED_STATUSES.includes(status);
}

/**
 * The three milestones, counted separately (PRD §14: "'placed' must distinguish offer
 * received, accepted and joined ... Keep all three separately tracked regardless").
 *
 * Deliberately NOT a single "placed" number. Offers received is the widest, joined the
 * narrowest, and a report that quotes one of them as "placements" without saying which is
 * the most common way a placement rate gets inflated.
 */
export interface PlacementCounts {
  offersReceived: number;
  accepted: number;
  joined: number;
}

export function countMilestones(offers: readonly OfferFacts[]): PlacementCounts {
  return {
    // An accepted or joined offer was received first — the wider number includes them,
    // which is what makes it the wider number.
    offersReceived: offers.filter((o) =>
      [
        OfferStatus.OFFERED,
        OfferStatus.ACCEPTED,
        OfferStatus.JOINED,
        OfferStatus.DECLINED,
        OfferStatus.DID_NOT_JOIN,
        OfferStatus.EXPIRED,
        OfferStatus.RESCINDED,
      ].includes(o.status),
    ).length,
    accepted: offers.filter((o) =>
      [OfferStatus.ACCEPTED, OfferStatus.JOINED, OfferStatus.DID_NOT_JOIN].includes(o.status),
    ).length,
    joined: offers.filter((o) => o.status === OfferStatus.JOINED).length,
  };
}

/** The best offer a student holds, by CTC — for "include already-placed students only for
 *  a higher package" (PRD §7). Null when they hold none worth comparing. */
export function bestOfferCtc(offers: readonly OfferFacts[]): number | null {
  const live = offers.filter(
    (o) =>
      [OfferStatus.OFFERED, OfferStatus.ACCEPTED, OfferStatus.JOINED].includes(o.status) &&
      typeof o.ctc === 'number' &&
      Number.isFinite(o.ctc),
  );
  if (live.length === 0) return null;
  return Math.max(...live.map((o) => o.ctc as number));
}
