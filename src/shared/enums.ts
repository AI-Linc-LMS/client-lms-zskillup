/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo
 * (backend-repo/src/shared & frontend-repo/src/shared). Change both together.
 */

/** Three roles (SYSTEM_OVERVIEW / ADR-002 / Implementation Plan §2). */
export enum UserRole {
  STUDENT = 'STUDENT',
  COLLEGE_ADMIN = 'COLLEGE_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

/** User lifecycle status (Implementation Plan §3.1). */
export enum UserStatus {
  INVITED = 'INVITED',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

/** College operational status (Implementation Plan §3.1). */
export enum CollegeStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

/** Student branch / stream (Implementation Plan §3.1). */
export enum Branch {
  CSE = 'CSE',
  IT = 'IT',
  ECE = 'ECE',
  EEE = 'EEE',
  MECH = 'MECH',
  CIVIL = 'CIVIL',
  OTHER = 'OTHER',
}

/** Placement-readiness bands for the PPS surface (sidebar gauge). */
export enum PpsBand {
  AT_RISK = 'AT_RISK',
  IN_TRAINING = 'IN_TRAINING',
  READY = 'READY',
}
