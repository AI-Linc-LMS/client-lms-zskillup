/**
 * Department vocabulary. Stored as `student_profiles.branch` (the `student_branch`
 * enum: CSE / IT / ECE / EEE / MECH / CIVIL / OTHER) — the same field the TPO panel
 * labels "Dept." and the student report exports as "Branch". Shared by the one-time
 * pre-assessment details gate and the assessment-results export so both speak the
 * same labels.
 */
export const BRANCH_OPTIONS = [
  { value: 'CSE', label: 'Computer Science Engineering (CSE)' },
  { value: 'IT', label: 'Information Technology (IT)' },
  { value: 'ECE', label: 'Electronics & Communication Engineering (ECE)' },
  { value: 'EEE', label: 'Electrical & Electronics Engineering (EEE)' },
  { value: 'MECH', label: 'Mechanical Engineering (MECH)' },
  { value: 'CIVIL', label: 'Civil Engineering (CIVIL)' },
  { value: 'OTHER', label: 'Other' },
] as const;

export type BranchCode = (typeof BRANCH_OPTIONS)[number]['value'];

/** Full label for forms / locked displays ("Computer Science Engineering (CSE)"). */
export function branchLabel(b: string | null | undefined): string {
  if (!b) return '';
  return BRANCH_OPTIONS.find((o) => o.value === b)?.label ?? b;
}

/** Short form for dense tables and exports ("CSE", "IT", … "Other"). */
export function branchShort(b: string | null | undefined): string {
  if (!b) return '';
  return b === 'OTHER' ? 'Other' : b;
}
