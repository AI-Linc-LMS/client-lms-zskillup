/**
 * SHARED CONTRACT — DUPLICATED BYTE-FOR-BYTE ACROSS BOTH REPOS (ADR-011).
 *
 * BULK-ADDING STUDENTS INTO A DRIVE THEY REGISTERED FOR SOMEWHERE ELSE.
 *
 * A placement opportunity is circulated on WhatsApp, a Google Form, the college ERP or a
 * sheet the TPO keeps, and the students who answered it are already committed to that
 * drive without ever touching the job board. Today there is no way to get them in: bulk
 * invite attaches a student to a COLLEGE, and nothing attaches one to a DRIVE. So the
 * drive's applicant list, its funnel, its rounds and its employer export all describe a
 * fraction of the people actually in the process, and the TPO keeps the real list in
 * Excel — which is the thing this product exists to replace.
 *
 * FOUR RULES THIS FILE EXISTS TO ENFORCE:
 *
 *   1. NEVER CREATE A SECOND ACCOUNT FOR SOMEONE WHO HAS ONE. A duplicate account splits
 *      a student's practice history, entitlement and offers in two, and the platform has
 *      no merge. This is not hypothetical: 28 students at one college already hold two
 *      accounts under different emails, and 18 of them use the one the college never
 *      listed. Matching is therefore by email, then phone, then roll number, and a row
 *      that matches an existing person ATTACHES rather than creates.
 *
 *   2. A BULK-ADDED APPLICANT IS A REAL APPLICANT. Once added they must behave exactly
 *      like someone who applied on the board — same pipeline, search, rounds, exports,
 *      reporting. The only difference is {@link ApplicationSource}, recorded so a funnel
 *      can say which applications the platform earned and which the college brought.
 *
 *   3. EVERY ROW IS ACCOUNTED FOR, BY NUMBER, BEFORE ANYTHING IS WRITTEN. "412 of 455
 *      imported" tells an operator that 43 students are missing without saying which, so
 *      nobody chases them. Preview classifies all rows into {@link ImportRowOutcome} and
 *      names each one with its line number; the operator fixes or excludes, then applies.
 *
 *   4. ALREADY IN THE DRIVE IS NOT AN ERROR. Re-uploading last week's sheet with ten new
 *      names at the bottom is the normal way this is used. Those rows report as
 *      ALREADY_IN_DRIVE and are skipped without touching the existing application — in
 *      particular WITHOUT resetting a candidate who has since moved to Interview back to
 *      Applied, which is the way an importer destroys a week of a TPO's work.
 */

/** How an application reached the platform. Recorded on every application row. */
export enum ApplicationSource {
  /** The student applied through the public job board. The default for everything. */
  JOB_BOARD = 'JOB_BOARD',
  /** Imported from a sheet by an operator (this file's flow). */
  BULK_UPLOAD = 'BULK_UPLOAD',
  /** Registered offline — a form, a desk, a WhatsApp reply — and keyed in one at a time. */
  OFFLINE = 'OFFLINE',
  /** Added by a TPO on the student's behalf from inside the drive. */
  TPO_ADDED = 'TPO_ADDED',
}

export const APPLICATION_SOURCE_LABELS: Readonly<Record<ApplicationSource, string>> = {
  [ApplicationSource.JOB_BOARD]: 'Applied on the job board',
  [ApplicationSource.BULK_UPLOAD]: 'Bulk upload',
  [ApplicationSource.OFFLINE]: 'Offline registration',
  [ApplicationSource.TPO_ADDED]: 'Added by TPO',
};

/** The default for an application created by any path that does not say otherwise. */
export const DEFAULT_APPLICATION_SOURCE = ApplicationSource.JOB_BOARD;

/** Columns a drive roster upload may carry. */
export enum RosterColumn {
  FIRST_NAME = 'FIRST_NAME',
  LAST_NAME = 'LAST_NAME',
  FULL_NAME = 'FULL_NAME',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  COLLEGE = 'COLLEGE',
  BATCH = 'BATCH',
  COURSE = 'COURSE',
  BRANCH = 'BRANCH',
  ROLL_NUMBER = 'ROLL_NUMBER',
  APPLICATION_DATE = 'APPLICATION_DATE',
  CURRENT_STAGE = 'CURRENT_STAGE',
}

/**
 * Header spellings accepted for each column, lower-cased.
 *
 * Deliberately generous, for the same reason the academic import is: these sheets come
 * out of Google Forms and college ERPs whose headers nobody controls, and rejecting
 * "Email Id" because the template said "email" turns a two-minute job into a morning of
 * renaming columns, after which the import never happens and the data stays in Excel.
 */
export const ROSTER_HEADERS: Readonly<Record<RosterColumn, readonly string[]>> = {
  [RosterColumn.FIRST_NAME]: ['first name', 'firstname', 'first', 'given name'],
  [RosterColumn.LAST_NAME]: ['last name', 'lastname', 'last', 'surname'],
  [RosterColumn.FULL_NAME]: ['full name', 'ful name', 'name', 'student name', 'candidate name'],
  [RosterColumn.EMAIL]: ['email', 'email id', 'email address', 'e-mail', 'mail', 'email_id'],
  [RosterColumn.PHONE]: ['phone', 'mobile', 'mobile no', 'mobile number', 'phone number', 'contact'],
  [RosterColumn.COLLEGE]: ['college', 'college name', 'institute', 'institution'],
  [RosterColumn.BATCH]: ['batch', 'cohort', 'passout year', 'year of passing', 'graduation year'],
  [RosterColumn.COURSE]: ['course', 'degree', 'programme', 'program'],
  [RosterColumn.BRANCH]: ['branch', 'department', 'dept', 'specialisation', 'specialization'],
  [RosterColumn.ROLL_NUMBER]: ['roll number', 'roll no', 'regn no', 'registration number', 'student id', 'reg no'],
  [RosterColumn.APPLICATION_DATE]: ['application date', 'applied on', 'applied at', 'date'],
  [RosterColumn.CURRENT_STAGE]: ['current stage', 'stage', 'status', 'application status'],
};

/** What preview decided about one row. Every row lands in exactly one of these. */
export enum ImportRowOutcome {
  /** Matched an existing account; it will be attached to the drive. */
  EXISTING_STUDENT = 'EXISTING_STUDENT',
  /** No account matched; one will be created and attached. */
  NEW_STUDENT = 'NEW_STUDENT',
  /** This person already has an application on this drive. Skipped, untouched. */
  ALREADY_IN_DRIVE = 'ALREADY_IN_DRIVE',
  /** The same person appears earlier in this file. Only the first is used. */
  DUPLICATE_ROW = 'DUPLICATE_ROW',
  /** A mandatory field is blank. Distinct from INVALID: nothing is wrong, something is absent. */
  MISSING_REQUIRED = 'MISSING_REQUIRED',
  /** A value is present but unusable — a malformed email, an unknown stage. */
  INVALID = 'INVALID',
  /** Matched an account that cannot be added: not a student, or another college's. */
  BLOCKED = 'BLOCKED',
}

export const ROW_OUTCOME_LABELS: Readonly<Record<ImportRowOutcome, string>> = {
  [ImportRowOutcome.EXISTING_STUDENT]: 'Existing student',
  [ImportRowOutcome.NEW_STUDENT]: 'New student',
  [ImportRowOutcome.ALREADY_IN_DRIVE]: 'Already in this drive',
  [ImportRowOutcome.DUPLICATE_ROW]: 'Duplicate row',
  [ImportRowOutcome.MISSING_REQUIRED]: 'Missing required information',
  [ImportRowOutcome.INVALID]: 'Invalid value',
  [ImportRowOutcome.BLOCKED]: 'Cannot be added',
};

/** Outcomes that will result in a write when the import is applied. */
export const IMPORTABLE_OUTCOMES: readonly ImportRowOutcome[] = [
  ImportRowOutcome.EXISTING_STUDENT,
  ImportRowOutcome.NEW_STUDENT,
];

/** Outcomes the operator should fix before applying. Never block the import — the
 *  operator may knowingly proceed and deal with the rest separately. */
export const FIXABLE_OUTCOMES: readonly ImportRowOutcome[] = [
  ImportRowOutcome.MISSING_REQUIRED,
  ImportRowOutcome.INVALID,
  ImportRowOutcome.BLOCKED,
];

/** One parsed row, before matching. */
export interface RosterRow {
  /** 1-based line in the uploaded file, header included — so an error names what the
   *  operator sees in their spreadsheet, not an index into an array. */
  line: number;
  email: string;
  fullName: string | null;
  phone: string | null;
  rollNumber: string | null;
  branch: string | null;
  batch: string | null;
  course: string | null;
  collegeName: string | null;
  applicationDate: string | null;
  currentStage: string | null;
}

/** One row after matching, as preview returns it. */
export interface PreviewedRow extends RosterRow {
  outcome: ImportRowOutcome;
  /** Why, in words an operator can act on. Always present for a non-importable outcome. */
  reason: string | null;
  /** The matched account, when one was found. */
  matchedUserId: string | null;
  matchedEmail: string | null;
  /** Which field matched — shown so an operator can sanity-check a phone-only match. */
  matchedOn: 'EMAIL' | 'PHONE' | 'ROLL_NUMBER' | null;
  /** The stage this row would land in, resolved from `currentStage` or the request default. */
  resolvedStage: string | null;
}

export interface ImportPreview {
  rows: PreviewedRow[];
  counts: Readonly<Record<ImportRowOutcome, number>>;
  /** Rows read from the file, including every rejected one. */
  total: number;
  /** How many rows applying right now would write. */
  importable: number;
}

export interface ImportResult {
  /** Applications created against existing accounts. */
  attached: number;
  /** Accounts created, each also attached. */
  created: number;
  /** Rows skipped for any reason, with the per-row detail in `rows`. */
  skipped: number;
  rows: PreviewedRow[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** True when `value` is a usable email. Exported so both repos test the same rule. */
export function isUsableEmail(value: string | null | undefined): boolean {
  return typeof value === 'string' && EMAIL_RE.test(value.trim());
}

/**
 * Digits only, last 10 kept.
 *
 * Indian mobile numbers arrive as `+91 98765 43210`, `098765 43210` and `9876543210` in
 * the same column of the same sheet, and three spellings of one number match nothing.
 * Returns null for anything that cannot be a mobile, so a half-typed number never
 * silently matches a different student.
 */
export function normalisePhone(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, '');
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

/** Case- and space-insensitive key for a roll number. */
export function normaliseRollNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = String(value).replace(/\s+/g, '').toUpperCase();
  return v.length ? v : null;
}

/**
 * The identity key a row is deduplicated on WITHIN one file.
 *
 * Email when there is one, because it is the only field that is both unique and present
 * for nearly every row. Falls back to phone, then roll number, so two rows for the same
 * person with no email still collapse rather than importing twice.
 */
export function rowIdentity(row: RosterRow): string | null {
  const email = row.email?.trim().toLowerCase();
  if (email) return `e:${email}`;
  const phone = normalisePhone(row.phone);
  if (phone) return `p:${phone}`;
  const roll = normaliseRollNumber(row.rollNumber);
  if (roll) return `r:${roll}`;
  return null;
}

/** An empty count map, so a caller never has to guard a missing key. */
export function emptyCounts(): Record<ImportRowOutcome, number> {
  return {
    [ImportRowOutcome.EXISTING_STUDENT]: 0,
    [ImportRowOutcome.NEW_STUDENT]: 0,
    [ImportRowOutcome.ALREADY_IN_DRIVE]: 0,
    [ImportRowOutcome.DUPLICATE_ROW]: 0,
    [ImportRowOutcome.MISSING_REQUIRED]: 0,
    [ImportRowOutcome.INVALID]: 0,
    [ImportRowOutcome.BLOCKED]: 0,
  };
}

/**
 * Resolve one header cell to the column it means, or null when it means nothing we use.
 * Matching is lower-cased and trimmed; punctuation differences are not forgiven beyond
 * the spellings listed, because guessing a column is how marks land in the wrong field.
 */
export function resolveHeader(cell: string): RosterColumn | null {
  const key = String(cell ?? '').trim().toLowerCase().replace(/[._]+/g, ' ').replace(/\s+/g, ' ');
  for (const [col, spellings] of Object.entries(ROSTER_HEADERS) as Array<
    [RosterColumn, readonly string[]]
  >) {
    if (spellings.includes(key)) return col;
  }
  return null;
}

/**
 * The template an operator downloads. Keep it in the contract so both repos offer the
 * same columns and a sheet built from one repo's template imports in the other.
 */
export const ROSTER_TEMPLATE_HEADERS: readonly string[] = [
  'First Name',
  'Last Name',
  'Email',
  'Phone',
  'College',
  'Batch',
  'Course',
  'Branch',
  'Registration Number',
  'Application Date',
  'Current Stage',
];
