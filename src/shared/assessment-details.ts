/**
 * SHARED CONTRACT - pre-assessment details rules (ADR-011 duplicated contract).
 * The backend implements the SAME rules for GET /me, POST /mocks/:id/start and
 * PATCH /me; change both sides together or the gate and the server disagree.
 *
 * Kept dependency-free (no `@/` imports, erasable TypeScript only) so it can be
 * mirrored as-is and exercised directly by `node --test`.
 *
 *   Rule 1  Phone       strip spaces / hyphens / dots / parentheses, then a leading
 *                       "+91", or "91" / "0" when that leaves 10 digits. Valid iff
 *                       the result is ^[6-9]\d{9}$. Persist the normalized 10 digits.
 *   Rule 2  Name/college NFKC, drop format chars (\p{Cf}), collapse whitespace, trim.
 *                       Valid iff >= 2 letters (\p{L}) and <= 200 characters.
 *   Rule 3  Department  one of CSE, IT, ECE, EEE, MECH, CIVIL, OTHER.
 *   Rule 5  Complete    STUDENT only: valid name AND non-blank email AND a resolved
 *                       college that is canonical or valid by rule 2 AND department
 *                       AND valid phone. Other roles are never gated.
 */

/** Max characters for a name / college value (rule 2). */
export const DETAIL_TEXT_MAX = 200;
/** Input cap for a phone field - room for "+91 (987) 654-3210" style formatting. */
export const PHONE_INPUT_MAX = 16;

export const BRANCH_CODES = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'OTHER'] as const;
export type BranchCodeValue = (typeof BRANCH_CODES)[number];

/** Keys the server reports in PROFILE_DETAILS_REQUIRED `details.missing`. */
export type DetailKey = 'fullName' | 'email' | 'collegeName' | 'branch' | 'phone';
export const DETAIL_KEYS: readonly DetailKey[] = ['fullName', 'email', 'collegeName', 'branch', 'phone'];

// ── Rule 1: phone ────────────────────────────────────────────────────────────

/** Rule 1 normalization only (no validity check). Blank/nullish → ''. */
export function normalizePhone(raw: string | null | undefined): string {
  let s = (raw ?? '').replace(/[\s\-.()]/g, '');
  if (s.startsWith('+91')) s = s.slice(3);
  else if (s.startsWith('91') && /^\d{10}$/.test(s.slice(2))) s = s.slice(2);
  else if (s.startsWith('0') && /^\d{10}$/.test(s.slice(1))) s = s.slice(1);
  return s;
}

export function isValidPhone(raw: string | null | undefined): boolean {
  return /^[6-9]\d{9}$/.test(normalizePhone(raw));
}

// ── Rule 2: name / college text ──────────────────────────────────────────────

/** Rule 2 cleaning only (no validity check). Blank/nullish → ''. */
export function cleanDetailText(raw: string | null | undefined): string {
  return (raw ?? '')
    .normalize('NFKC')
    .replace(/\p{Cf}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isValidDetailText(raw: string | null | undefined): boolean {
  const s = cleanDetailText(raw);
  return s.length <= DETAIL_TEXT_MAX && (s.match(/\p{L}/gu)?.length ?? 0) >= 2;
}

// ── Rule 3: department ───────────────────────────────────────────────────────

export function isBranchCode(v: unknown): v is BranchCodeValue {
  return typeof v === 'string' && (BRANCH_CODES as readonly string[]).includes(v);
}

// ── Rule 5: completeness (FE view of GET /me) ────────────────────────────────

/** The slice of GET /me the rules read. `ApiMe` is structurally assignable. */
export interface DetailsSubject {
  role: string;
  email: string | null;
  fullName: string | null;
  collegeId?: string | null;
  /** Top-level resolved college (rule 4) - absent on backends that predate it. */
  collegeName?: string | null;
  studentProfile: {
    collegeId: string | null;
    collegeName: string | null;
    branch: string | null;
    phone: string | null;
  } | null;
}

/** The college the report will show: top-level `collegeName` when the backend sends
 *  it, else the profile's (both follow rule 4 on current backends). */
export function resolvedCollegeName(me: DetailsSubject): string | null {
  return me.collegeName ?? me.studentProfile?.collegeName ?? null;
}

/** A college attached by FK resolves to the canonical tenancy name, which always
 *  counts as valid; only a free-text name has to pass rule 2. */
export function isCollegeValid(me: DetailsSubject): boolean {
  const name = resolvedCollegeName(me);
  if (!name?.trim()) return false;
  const hasFk = !!(me.collegeId ?? me.studentProfile?.collegeId);
  return hasFk || isValidDetailText(name);
}

/** Report fields that are missing OR invalid, in form order. Non-students → []. */
export function missingAssessmentDetails(me: DetailsSubject | null): DetailKey[] {
  if (!me || me.role !== 'STUDENT') return [];
  const p = me.studentProfile;
  const missing: DetailKey[] = [];
  if (!isValidDetailText(me.fullName)) missing.push('fullName');
  if (!isCollegeValid(me)) missing.push('collegeName');
  if (!isBranchCode(p?.branch)) missing.push('branch');
  if (!me.email?.trim()) missing.push('email');
  if (!isValidPhone(p?.phone)) missing.push('phone');
  return missing;
}

export function needsAssessmentDetails(me: DetailsSubject | null): boolean {
  return missingAssessmentDetails(me).length > 0;
}

// ── Error payload helpers ────────────────────────────────────────────────────

/** `details.missing` of a PROFILE_DETAILS_REQUIRED error, filtered to known keys. */
export function missingDetailsFromError(details: unknown): DetailKey[] {
  if (!details || typeof details !== 'object') return [];
  const missing = (details as { missing?: unknown }).missing;
  if (!Array.isArray(missing)) return [];
  return DETAIL_KEYS.filter((k) => missing.includes(k));
}

// ── Same-device "attempt in progress" marker ─────────────────────────────────

/** localStorage key remembering a live attempt for one mock + sitting, so a reload
 *  mid-exam resumes straight away instead of re-running the details gate. */
export function liveAttemptKey(mockId: string, scheduledId?: string | null): string {
  return `assessment-live:${mockId}:${scheduledId || 'none'}`;
}

/** True when a stored marker value is an ISO deadline still in the future. */
export function isLiveAttemptMarker(value: string | null | undefined, nowMs: number): boolean {
  if (!value) return false;
  const t = Date.parse(value);
  return Number.isFinite(t) && t > nowMs;
}
