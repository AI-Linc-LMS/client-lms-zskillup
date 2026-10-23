/**
 * SHARED CONTRACT — DUPLICATED BYTE-FOR-BYTE ACROSS BOTH REPOS (ADR-011).
 *
 * COMPANY-WIDE AND DRIVE-WIDE STUDENT SEARCH (additional requirement 4).
 *
 * WHY THIS IS NOT AN EXTENSION OF THE §15 CANDIDATE SEARCH. That one answers "who fits
 * THIS drive", and every row it returns is a candidate-fit evaluation against one drive's
 * rules. The questions this answers are about APPLICATIONS across drives — "show all
 * students who applied to Infosys", "who did we reject in that Capgemini drive", "who is
 * in an interview round right now" — and a student appears once per application, not once
 * per person. Bolting a cross-drive mode onto a per-drive endpoint would make every row
 * mean one of two different things depending on a flag, which is how a screen starts
 * lying about what it is showing.
 *
 * THE COMPANY FILTER KEYS ON NAME, NOT ID. Every drive in production carries a free-text
 * `company_name` and NOT ONE carries a `company_id` — the catalog link exists in the
 * schema and has never been used. A companyId filter would therefore be a control that
 * always returns nothing. The id is still accepted for the day drives are linked, but
 * name is the filter that works today, and the list of names is served from the data so
 * the dropdown can only ever offer a value that exists.
 *
 * TWO CONSEQUENCES OF FREE TEXT, BOTH DELIBERATE RATHER THAN HIDDEN:
 *   - "Cybaem Tech" and "Cybeam Tech" are one employer spelled two ways and will appear
 *     as two entries. The list reports counts so the mistake is visible rather than
 *     silently splitting a funnel.
 *   - Matching is exact and case-insensitive. Fuzzy matching would quietly merge two real
 *     employers with similar names, which is worse than showing a typo.
 */

/** A company as the filter offers it, counted from the data it would actually match. */
export interface CompanyFacet {
  /** Catalog id when the drive is linked. Null for the free-text ones, which is all of
   *  them today — hence `name` is the key the filter actually uses. */
  companyId: string | null;
  name: string;
  drives: number;
  applications: number;
}

/** A drive as the filter offers it. Narrowed by company when one is chosen. */
export interface DriveFacet {
  id: string;
  title: string;
  companyName: string | null;
  status: string;
  applications: number;
  /** So a long list can be read newest first, the order a placement team thinks in. */
  createdAt: string;
}

/** One row of the result: a student's application to a drive. */
export interface ApplicationSearchRow {
  applicationId: string;
  userId: string;
  fullName: string | null;
  email: string;
  phone: string | null;
  collegeId: string | null;
  collegeName: string | null;
  cohortName: string | null;
  branch: string | null;
  driveId: string;
  driveTitle: string;
  companyName: string | null;
  stage: string;
  stageLabel: string;
  /** How the application arrived — board, bulk upload, offline. */
  source: string;
  appliedAt: string;
  updatedAt: string;
  placementStatus: string | null;
  /** Null when the student has no offer on this drive, which is most of them. */
  offeredCtc: number | null;
}

export interface ApplicationSearchResult {
  rows: ApplicationSearchRow[];
  /** Matching applications, not people: a student in three drives is three rows. */
  total: number;
  /** Distinct students behind `total`, because "how many students" and "how many
   *  applications" are different questions a placement team asks in the same breath. */
  students: number;
  page: number;
  pageSize: number;
}

/** Sorts the result supports. Anything else is rejected rather than ignored. */
export enum ApplicationSortKey {
  APPLIED_AT = 'APPLIED_AT',
  UPDATED_AT = 'UPDATED_AT',
  NAME = 'NAME',
  COLLEGE = 'COLLEGE',
  COMPANY = 'COMPANY',
  STAGE = 'STAGE',
}

export const APPLICATION_SORT_LABELS: Readonly<Record<ApplicationSortKey, string>> = {
  [ApplicationSortKey.APPLIED_AT]: 'Applied',
  [ApplicationSortKey.UPDATED_AT]: 'Last activity',
  [ApplicationSortKey.NAME]: 'Student name',
  [ApplicationSortKey.COLLEGE]: 'College',
  [ApplicationSortKey.COMPANY]: 'Company',
  [ApplicationSortKey.STAGE]: 'Stage',
};

/** The SQL each sort maps to. Kept here so both repos agree on what a sort key means,
 *  and so the service can never be handed an arbitrary ORDER BY from a request. */
export const APPLICATION_SORT_SQL: Readonly<Record<ApplicationSortKey, string>> = {
  [ApplicationSortKey.APPLIED_AT]: 'a.applied_at',
  [ApplicationSortKey.UPDATED_AT]: 'a.updated_at',
  [ApplicationSortKey.NAME]: 'lower(u.full_name)',
  [ApplicationSortKey.COLLEGE]: 'lower(cl.name)',
  [ApplicationSortKey.COMPANY]: 'lower(j.company_name)',
  [ApplicationSortKey.STAGE]: 'a.status',
};

export const MAX_SEARCH_PAGE_SIZE = 200;
export const DEFAULT_SEARCH_PAGE_SIZE = 50;
/** An export is one file a human opens; past this it is a data dump with a different
 *  set of privacy questions, and should go through the audited export path instead. */
export const MAX_EXPORT_ROWS = 5000;

/**
 * Saved views — the questions a placement team asks every week, named.
 *
 * Each is a partial filter the client merges over whatever else is selected, so
 * "shortlisted awaiting HR" composed with a college filter still means that college.
 */
export interface SavedApplicationView {
  key: string;
  label: string;
  description: string;
}

export const SAVED_APPLICATION_VIEWS: readonly SavedApplicationView[] = [
  {
    key: 'IN_ROUNDS',
    label: 'Currently in a round',
    description: 'Anyone sitting in an interview or assessment round right now',
  },
  {
    key: 'OFFERED',
    label: 'Offer issued, awaiting response',
    description: 'Offered and not yet accepted, declined or expired',
  },
  {
    key: 'SELECTED',
    label: 'Selected',
    description: 'Cleared the process, whatever happened to the offer afterwards',
  },
  {
    key: 'REJECTED',
    label: 'Rejected',
    description: 'Not selected, with the stage they were rejected at',
  },
  {
    key: 'JOINED',
    label: 'Joined',
    description: 'Actually started, which is the only number that closes a placement',
  },
];
