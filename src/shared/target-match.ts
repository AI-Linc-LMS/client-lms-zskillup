import { JobTargetType } from './enums';

/**
 * HOW A TARGET ROW NAMES A STUDENT — the one definition, in one file.
 *
 * Lives in `shared/` because it now serves TWO domains: job/drive targeting and
 * admin-assigned mock interviews (migration 151), whose target table mirrors
 * catalog.job_posting_targets column for column so this SQL works over either. That is
 * the whole point of the paragraph below — a second copy would drift the same way the
 * first three did.
 *
 * There were three. `job-visibility` decided who sees a drive, `job-targets` counted
 * the audience the composer promises, and `drive-candidates` listed who to rank. All
 * three answered the same question in their own words, and they had already drifted:
 *
 *   - drive-candidates knew nothing about COMPANY targets, so a drive aimed at a
 *     company's registrants ranked nobody while being visible to them.
 *   - job-targets matched COLLEGE on `sp.college_id` alone — the detach bug
 *     placement-analytics documents — so its reach count missed every student whose
 *     college sits on the user row instead of the profile.
 *   - adding BATCH and BRANCH meant editing three places, and missing one would have
 *     made a batch-targeted drive visible to 24 students while showing 0 candidates.
 *
 * The shape differs legitimately: one asks "does this row name THIS viewer" with the
 * viewer's values bound as parameters, the others ask "does it name THIS STUDENT ROW"
 * against joined columns. So the caller supplies the right-hand side per type and this
 * owns the left — which type names what, and that every type is considered.
 *
 * `Record<JobTargetType, string>` is the point: adding a target type breaks every
 * caller until it has been given a comparison, instead of silently matching nobody.
 */
export type TargetComparisons = Record<JobTargetType, string>;

/** The OR-ed audience test, as a parenthesised SQL fragment over the alias `t`. */
export function targetMatchSql(cmp: TargetComparisons): string {
  const leg = (type: JobTargetType) => `(t.target_type = '${type}' AND ${cmp[type]})`;
  return `(
                ${leg(JobTargetType.USER)}
             OR ${leg(JobTargetType.COHORT)}
             OR ${leg(JobTargetType.COLLEGE)}
             OR ${leg(JobTargetType.COMPANY)}
             OR ${leg(JobTargetType.BATCH)}
             OR ${leg(JobTargetType.BRANCH)}
           )`;
}

/**
 * Comparisons against a joined student row.
 *
 * `u` is auth.users, `sp` is students.student_profiles.
 *
 * COLLEGE reads COALESCE(u.college_id, sp.college_id), NOT the profile alone. A
 * student's college lives on the user row for some accounts and the profile for
 * others; reading one of them is the detach bug that has already cost this codebase a
 * report, and job-targets was still making it.
 */
export function studentRowComparisons(u: string, sp: string): TargetComparisons {
  return {
    [JobTargetType.USER]: `t.target_id = ${u}.id`,
    [JobTargetType.COHORT]: `t.target_id = ${u}.cohort_id`,
    [JobTargetType.COLLEGE]: `t.target_id = COALESCE(${u}.college_id, ${sp}.college_id)`,
    [JobTargetType.COMPANY]: `t.target_id IN (
                        SELECT cr.company_id FROM students.company_registrations cr
                         WHERE cr.user_id = ${u}.id AND cr.status <> 'CANCELLED')`,
    // Value-typed: these name a fact on the profile rather than a row, and a student
    // who has not filled it in carries NULL — which fails to match rather than
    // matching every batch.
    [JobTargetType.BATCH]: `t.target_value = ${sp}.passout_year::text`,
    [JobTargetType.BRANCH]: `t.target_value = ${sp}.branch::text`,
  };
}

/**
 * Comparisons against a single viewer whose values are bound as parameters.
 *
 * Each argument is the placeholder text the caller has reserved, e.g. `$1`.
 */
export function viewerComparisons(p: {
  userId: string;
  cohortId: string;
  collegeId: string;
  companyIds: string;
  passoutYear: string;
  branch: string;
}): TargetComparisons {
  return {
    [JobTargetType.USER]: `t.target_id = ${p.userId}::uuid`,
    [JobTargetType.COHORT]: `t.target_id = ${p.cohortId}::uuid`,
    [JobTargetType.COLLEGE]: `t.target_id = ${p.collegeId}::uuid`,
    [JobTargetType.COMPANY]: `t.target_id = ANY(${p.companyIds}::uuid[])`,
    [JobTargetType.BATCH]: `t.target_value = ${p.passoutYear}`,
    [JobTargetType.BRANCH]: `t.target_value = ${p.branch}`,
  };
}
