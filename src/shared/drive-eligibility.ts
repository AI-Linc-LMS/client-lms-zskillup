/**
 * SHARED CONTRACT — DUPLICATED BYTE-FOR-BYTE ACROSS BOTH REPOS (ADR-011).
 *
 * HARD ELIGIBILITY FOR A PLACEMENT DRIVE (PRD §4 "Eligibility: academics" / "Eligibility:
 * other", consumed by §6's candidate-fit view and §8's visibility gate).
 *
 * Why rules and not columns. The PRD asks every academic criterion to support `>=`, `>`,
 * `<=`, `<`, a range, an exact match and "not applicable". Thirty flat columns cannot
 * express that, and the operator is the part employers actually argue about — "60%
 * throughout" means `>=60` on three separate scores, while "no CURRENT backlogs" and "no
 * backlog HISTORY" are different questions with different answers.
 *
 * Three rules this file exists to enforce, each of them a way a placement engine quietly
 * goes wrong:
 *
 *   1. MISSING IS NOT FAILING. A student with no 12th mark on file has not failed a 60%
 *      cut-off — nobody has asked them. {@link evaluateRule} returns UNKNOWN, never FAIL,
 *      and the drive decides (via {@link EligibilityRuleSet.missingDataPolicy}) whether
 *      that blocks, passes, or lands in a review queue. Treating absent data as zero is
 *      the single most damaging default available here: it rejects real candidates
 *      silently, and it is the exact failure mode that locked 86 students out of an
 *      assessment this month for want of a phone number.
 *
 *   2. EVERY VERDICT CARRIES ITS REASON. A FAIL without "12th 54% < 60%" is unusable by a
 *      TPO and indefensible to a student. The PRD requires reason codes (§6), so the
 *      reason is produced by the evaluator, not reconstructed by a UI.
 *
 *   3. SENSITIVE CRITERIA ARE NEVER A DEFAULT. Age and gender are expressible because some
 *      roles lawfully require them, but they are opt-in, must carry a justification, and
 *      are flagged for approval ({@link SENSITIVE_FIELDS}). The PRD is explicit: "never
 *      default filters".
 */

/** How a rule compares the student's value to the drive's threshold. */
export enum EligibilityOperator {
  GTE = 'GTE',
  GT = 'GT',
  LTE = 'LTE',
  LT = 'LT',
  /** Inclusive on both ends — `value` is the low bound, `valueMax` the high. */
  RANGE = 'RANGE',
  /** Exact scalar match (numbers) or membership (text/lists). */
  EQUALS = 'EQUALS',
  /** The student's value must be one of `options`. */
  IN = 'IN',
  /** The student's value must NOT be one of `options`. */
  NOT_IN = 'NOT_IN',
  /** Recorded but never enforced — keeps an employer's stated criterion visible. */
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

/**
 * The student attributes a drive can gate on. Numeric unless noted. Kept as a closed list
 * so a rule can never reference a field the evaluator has no value for.
 */
export enum EligibilityField {
  // ── Academics (PRD §4 "Eligibility: academics") ──────────────────────────
  SCORE_10TH = 'SCORE_10TH',
  SCORE_12TH = 'SCORE_12TH',
  SCORE_DIPLOMA = 'SCORE_DIPLOMA',
  SCORE_GRADUATION = 'SCORE_GRADUATION',
  SCORE_POSTGRADUATION = 'SCORE_POSTGRADUATION',
  /** Backlogs open RIGHT NOW. */
  ACTIVE_BACKLOGS = 'ACTIVE_BACKLOGS',
  /** Backlogs ever held, including cleared ones. A different question. */
  TOTAL_BACKLOGS = 'TOTAL_BACKLOGS',
  /** Years of break in education. */
  EDUCATION_GAP_YEARS = 'EDUCATION_GAP_YEARS',
  GRADUATION_YEAR = 'GRADUATION_YEAR',
  /** Text/list fields — use IN / NOT_IN / EQUALS. */
  DEGREE = 'DEGREE',
  BRANCH = 'BRANCH',
  COLLEGE = 'COLLEGE',
  /** 'PASSED_OUT' | 'CURRENT_STUDENT'. */
  ENROLMENT_STATUS = 'ENROLMENT_STATUS',

  // ── Other (PRD §4 "Eligibility: other") ──────────────────────────────────
  WORK_AUTHORISATION = 'WORK_AUTHORISATION',
  WILLING_TO_RELOCATE = 'WILLING_TO_RELOCATE',
  PREFERRED_LOCATION = 'PREFERRED_LOCATION',
  LANGUAGE = 'LANGUAGE',
  WILLING_NIGHT_SHIFT = 'WILLING_NIGHT_SHIFT',
  WILLING_TO_TRAVEL = 'WILLING_TO_TRAVEL',
  /** Days until the student can join. */
  NOTICE_PERIOD_DAYS = 'NOTICE_PERIOD_DAYS',

  // ── Lawful-only, never defaulted (PRD §4: "only where lawful, necessary and
  //    explicitly approved — never default filters") ────────────────────────
  AGE = 'AGE',
  GENDER = 'GENDER',
}

/**
 * Fields that may only be used with an explicit written justification and approval.
 * The PRD forbids them as defaults; the API refuses a rule on one of these without
 * {@link EligibilityRule.justification}.
 */
export const SENSITIVE_FIELDS: ReadonlySet<EligibilityField> = new Set([
  EligibilityField.AGE,
  EligibilityField.GENDER,
]);

/** Fields compared as numbers. Everything else is text or a list. */
export const NUMERIC_FIELDS: ReadonlySet<EligibilityField> = new Set([
  EligibilityField.SCORE_10TH,
  EligibilityField.SCORE_12TH,
  EligibilityField.SCORE_DIPLOMA,
  EligibilityField.SCORE_GRADUATION,
  EligibilityField.SCORE_POSTGRADUATION,
  EligibilityField.ACTIVE_BACKLOGS,
  EligibilityField.TOTAL_BACKLOGS,
  EligibilityField.EDUCATION_GAP_YEARS,
  EligibilityField.GRADUATION_YEAR,
  EligibilityField.NOTICE_PERIOD_DAYS,
  EligibilityField.AGE,
]);

/** Academic scores are stored on a 0–100 percentage scale; CGPA is converted on entry. */
export const PERCENTAGE_FIELDS: ReadonlySet<EligibilityField> = new Set([
  EligibilityField.SCORE_10TH,
  EligibilityField.SCORE_12TH,
  EligibilityField.SCORE_DIPLOMA,
  EligibilityField.SCORE_GRADUATION,
  EligibilityField.SCORE_POSTGRADUATION,
]);

/** One hard criterion on one field. */
export interface EligibilityRule {
  field: EligibilityField;
  operator: EligibilityOperator;
  /** Low bound for RANGE; the threshold otherwise. Unused by IN/NOT_IN/NOT_APPLICABLE. */
  value?: number | string | null;
  /** High bound, RANGE only. */
  valueMax?: number | null;
  /** Allowed (or disallowed) values for IN / NOT_IN. */
  options?: string[];
  /** Shown to staff and students instead of the raw rule, when set. */
  label?: string | null;
  /** Required for a {@link SENSITIVE_FIELDS} rule: why this role lawfully needs it. */
  justification?: string | null;
}

/** What a drive does about a student whose data for a rule is missing (PRD §6, §18). */
export enum MissingDataPolicy {
  /** Cannot be judged → not eligible to apply, but shown as "data missing", never "failed". */
  BLOCK = 'BLOCK',
  /** Benefit of the doubt — the rule passes. */
  PASS = 'PASS',
  /** Eligible, but surfaced to staff for a decision. The PRD's preferred default. */
  REVIEW = 'REVIEW',
}

/** The complete hard-eligibility configuration stored on a drive. */
export interface EligibilityRuleSet {
  rules: EligibilityRule[];
  /** Applies to every rule unless a future per-rule override is added. */
  missingDataPolicy: MissingDataPolicy;
}

export const EMPTY_RULE_SET: EligibilityRuleSet = {
  rules: [],
  missingDataPolicy: MissingDataPolicy.REVIEW,
};

/** Verdict for one rule, or for a whole set. */
export enum EligibilityVerdict {
  PASS = 'PASS',
  FAIL = 'FAIL',
  /** The student has no value on file. NOT a failure — see the file header. */
  UNKNOWN = 'UNKNOWN',
}

export interface RuleResult {
  field: EligibilityField;
  verdict: EligibilityVerdict;
  /** Human-readable reason, always present — "12th 54% < 60%", "No graduation score on file". */
  reason: string;
  /** What the student had, for the audit trail. */
  studentValue: number | string | null;
}

export interface EligibilityOutcome {
  /** PASS only when every rule passed. UNKNOWN when nothing failed but something is missing. */
  verdict: EligibilityVerdict;
  /** Whether the student may apply, after {@link MissingDataPolicy} is applied. */
  eligible: boolean;
  /** True when the only thing standing in the way is absent data. */
  needsReview: boolean;
  results: RuleResult[];
  /** Just the failing/missing reasons, for a compact table cell. */
  reasons: string[];
}

/** The student-side values a rule set is evaluated against. Absent key = no data. */
export type StudentEligibilityFacts = Partial<Record<EligibilityField, number | string | null>>;

/** Pretty name for a field, for reasons and form labels. */
export const FIELD_LABELS: Readonly<Record<EligibilityField, string>> = {
  [EligibilityField.SCORE_10TH]: '10th',
  [EligibilityField.SCORE_12TH]: '12th',
  [EligibilityField.SCORE_DIPLOMA]: 'Diploma',
  [EligibilityField.SCORE_GRADUATION]: 'Graduation',
  [EligibilityField.SCORE_POSTGRADUATION]: 'Post-graduation',
  [EligibilityField.ACTIVE_BACKLOGS]: 'Active backlogs',
  [EligibilityField.TOTAL_BACKLOGS]: 'Total backlogs',
  [EligibilityField.EDUCATION_GAP_YEARS]: 'Education gap (years)',
  [EligibilityField.GRADUATION_YEAR]: 'Graduation year',
  [EligibilityField.DEGREE]: 'Degree',
  [EligibilityField.BRANCH]: 'Branch',
  [EligibilityField.COLLEGE]: 'College',
  [EligibilityField.ENROLMENT_STATUS]: 'Enrolment status',
  [EligibilityField.WORK_AUTHORISATION]: 'Work authorisation',
  [EligibilityField.WILLING_TO_RELOCATE]: 'Willing to relocate',
  [EligibilityField.PREFERRED_LOCATION]: 'Preferred location',
  [EligibilityField.LANGUAGE]: 'Language',
  [EligibilityField.WILLING_NIGHT_SHIFT]: 'Willing to work night shifts',
  [EligibilityField.WILLING_TO_TRAVEL]: 'Willing to travel',
  [EligibilityField.NOTICE_PERIOD_DAYS]: 'Notice period (days)',
  [EligibilityField.AGE]: 'Age',
  [EligibilityField.GENDER]: 'Gender',
};

/** "60%", "2", "2027" — units where they help a reader. */
function fmt(field: EligibilityField, v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—';
  return PERCENTAGE_FIELDS.has(field) ? `${v}%` : String(v);
}

const OPERATOR_WORDS: Readonly<Record<EligibilityOperator, string>> = {
  [EligibilityOperator.GTE]: 'at least',
  [EligibilityOperator.GT]: 'more than',
  [EligibilityOperator.LTE]: 'at most',
  [EligibilityOperator.LT]: 'less than',
  [EligibilityOperator.RANGE]: 'between',
  [EligibilityOperator.EQUALS]: 'exactly',
  [EligibilityOperator.IN]: 'one of',
  [EligibilityOperator.NOT_IN]: 'not one of',
  [EligibilityOperator.NOT_APPLICABLE]: 'not applicable',
};

/** "at least 60%", "between 60% and 80%", "one of CSE, IT" — the rule in words. */
export function describeRule(rule: EligibilityRule): string {
  const name = rule.label || FIELD_LABELS[rule.field];
  if (rule.operator === EligibilityOperator.NOT_APPLICABLE) return `${name} — not applicable`;
  if (rule.operator === EligibilityOperator.RANGE) {
    return `${name} between ${fmt(rule.field, rule.value as number)} and ${fmt(rule.field, rule.valueMax)}`;
  }
  if (rule.operator === EligibilityOperator.IN || rule.operator === EligibilityOperator.NOT_IN) {
    return `${name} ${OPERATOR_WORDS[rule.operator]} ${(rule.options ?? []).join(', ') || '—'}`;
  }
  return `${name} ${OPERATOR_WORDS[rule.operator]} ${fmt(rule.field, rule.value as number)}`;
}

/** Case/whitespace-insensitive compare for the text fields. */
function sameText(a: unknown, b: unknown): boolean {
  return String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();
}

/**
 * Evaluate ONE rule against ONE student. Never throws: a malformed rule is reported as
 * UNKNOWN with a reason rather than taking a drive's whole evaluation down.
 */
export function evaluateRule(
  rule: EligibilityRule,
  facts: StudentEligibilityFacts,
): RuleResult {
  const name = rule.label || FIELD_LABELS[rule.field];
  const raw = facts[rule.field];

  if (rule.operator === EligibilityOperator.NOT_APPLICABLE) {
    return {
      field: rule.field,
      verdict: EligibilityVerdict.PASS,
      reason: `${name} not applicable`,
      studentValue: raw ?? null,
    };
  }

  // Missing is missing — see rule 1 in the file header.
  if (raw === null || raw === undefined || raw === '') {
    return {
      field: rule.field,
      verdict: EligibilityVerdict.UNKNOWN,
      reason: `No ${name.toLowerCase()} on file`,
      studentValue: null,
    };
  }

  const pass = (ok: boolean, why: string): RuleResult => ({
    field: rule.field,
    verdict: ok ? EligibilityVerdict.PASS : EligibilityVerdict.FAIL,
    reason: ok ? `${name} ${fmt(rule.field, raw)} meets ${describeRule(rule).toLowerCase()}` : why,
    studentValue: raw,
  });

  if (rule.operator === EligibilityOperator.IN || rule.operator === EligibilityOperator.NOT_IN) {
    const hit = (rule.options ?? []).some((o) => sameText(o, raw));
    const want = rule.operator === EligibilityOperator.IN;
    return pass(
      hit === want,
      `${name} ${fmt(rule.field, raw)} is ${want ? 'not ' : ''}${want ? 'in' : 'excluded by'} ${(rule.options ?? []).join(', ')}`,
    );
  }

  if (!NUMERIC_FIELDS.has(rule.field)) {
    // Text EQUALS — the only numeric-free operator left.
    return pass(sameText(raw, rule.value), `${name} ${fmt(rule.field, raw)} ≠ ${fmt(rule.field, rule.value as string)}`);
  }

  const got = Number(raw);
  const want = Number(rule.value);
  if (!Number.isFinite(got)) {
    return {
      field: rule.field,
      verdict: EligibilityVerdict.UNKNOWN,
      reason: `${name} on file is not a number`,
      studentValue: raw,
    };
  }
  const shortfall = `${name} ${fmt(rule.field, got)}`;
  switch (rule.operator) {
    case EligibilityOperator.GTE:
      return pass(got >= want, `${shortfall} < ${fmt(rule.field, want)}`);
    case EligibilityOperator.GT:
      return pass(got > want, `${shortfall} ≤ ${fmt(rule.field, want)}`);
    case EligibilityOperator.LTE:
      return pass(got <= want, `${shortfall} > ${fmt(rule.field, want)}`);
    case EligibilityOperator.LT:
      return pass(got < want, `${shortfall} ≥ ${fmt(rule.field, want)}`);
    case EligibilityOperator.EQUALS:
      return pass(got === want, `${shortfall} ≠ ${fmt(rule.field, want)}`);
    case EligibilityOperator.RANGE: {
      const hi = Number(rule.valueMax);
      const ok = Number.isFinite(hi) ? got >= want && got <= hi : false;
      return pass(ok, `${shortfall} outside ${fmt(rule.field, want)}–${fmt(rule.field, hi)}`);
    }
    default:
      return {
        field: rule.field,
        verdict: EligibilityVerdict.UNKNOWN,
        reason: `${name}: unsupported rule`,
        studentValue: raw,
      };
  }
}

/**
 * Evaluate a whole rule set. A set with no rules passes everyone — a drive that has not
 * been given criteria has not excluded anybody, which is the only safe reading.
 */
export function evaluateEligibility(
  set: EligibilityRuleSet | null | undefined,
  facts: StudentEligibilityFacts,
): EligibilityOutcome {
  const rules = set?.rules ?? [];
  const policy = set?.missingDataPolicy ?? MissingDataPolicy.REVIEW;
  const results = rules.map((r) => evaluateRule(r, facts));

  const failed = results.filter((r) => r.verdict === EligibilityVerdict.FAIL);
  const unknown = results.filter((r) => r.verdict === EligibilityVerdict.UNKNOWN);

  // A real FAIL always wins: missing data never rescues a candidate who demonstrably
  // misses a hard criterion, and never condemns one who merely has a gap on file.
  const verdict = failed.length
    ? EligibilityVerdict.FAIL
    : unknown.length
      ? EligibilityVerdict.UNKNOWN
      : EligibilityVerdict.PASS;

  const eligible =
    failed.length === 0 && (unknown.length === 0 || policy !== MissingDataPolicy.BLOCK);

  return {
    verdict,
    eligible,
    needsReview: failed.length === 0 && unknown.length > 0 && policy === MissingDataPolicy.REVIEW,
    results,
    reasons: [...failed, ...unknown].map((r) => r.reason),
  };
}

/**
 * Validation for an incoming rule set — returns the problems, empty when sound. Used by
 * the API before a drive is saved, so a nonsense rule can never reach evaluation.
 */
export function validateRuleSet(set: EligibilityRuleSet): string[] {
  const problems: string[] = [];
  const seen = new Set<EligibilityField>();
  for (const rule of set.rules ?? []) {
    const name = FIELD_LABELS[rule.field] ?? rule.field;
    if (seen.has(rule.field)) problems.push(`${name}: more than one rule on the same field`);
    seen.add(rule.field);

    if (SENSITIVE_FIELDS.has(rule.field) && !rule.justification?.trim()) {
      problems.push(`${name}: a sensitive criterion needs a written justification`);
    }
    if (rule.operator === EligibilityOperator.NOT_APPLICABLE) continue;

    if (rule.operator === EligibilityOperator.IN || rule.operator === EligibilityOperator.NOT_IN) {
      if (!rule.options?.length) problems.push(`${name}: choose at least one value`);
      continue;
    }
    if (rule.value === null || rule.value === undefined || rule.value === '') {
      problems.push(`${name}: needs a value`);
      continue;
    }
    if (NUMERIC_FIELDS.has(rule.field)) {
      const n = Number(rule.value);
      if (!Number.isFinite(n)) problems.push(`${name}: value must be a number`);
      else if (PERCENTAGE_FIELDS.has(rule.field) && (n < 0 || n > 100)) {
        problems.push(`${name}: a percentage must be between 0 and 100`);
      }
      if (rule.operator === EligibilityOperator.RANGE) {
        const hi = Number(rule.valueMax);
        if (!Number.isFinite(hi)) problems.push(`${name}: a range needs an upper value`);
        else if (hi < n) problems.push(`${name}: the upper value is below the lower one`);
      }
    }
  }
  return problems;
}
