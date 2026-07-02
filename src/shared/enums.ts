/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo
 * (backend-repo/src/shared & frontend-repo/src/shared). Change both together.
 */

/**
 * Four roles (SYSTEM_OVERVIEW / ADR-002 / Implementation Plan §2).
 * - STUDENT: end user.
 * - COLLEGE_ADMIN: college placement officer (TPO) — college-scoped.
 * - ADMIN: internal platform operator — creates college registration requests,
 *   activates subscriptions, seeds imports. Below SUPER_ADMIN.
 * - SUPER_ADMIN: platform owner — approves colleges, full catalog + role mgmt.
 */
export enum UserRole {
  STUDENT = 'STUDENT',
  COLLEGE_ADMIN = 'COLLEGE_ADMIN',
  ADMIN = 'ADMIN',
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

// ─── Catalog (Sprint 3) ──────────────────────────────────────────────────────

/** Company type (Implementation Plan §3.2). */
export enum CompanyType {
  SERVICE = 'SERVICE',
  CONSULTING = 'CONSULTING',
  PRODUCT = 'PRODUCT',
}

/** Course category (Implementation Plan §3.2). */
export enum CourseCategory {
  APTITUDE = 'APTITUDE',
  PROGRAMMING_DSA = 'PROGRAMMING_DSA',
  COMMUNICATION_HR = 'COMMUNICATION_HR',
  MOCK_DRIVE = 'MOCK_DRIVE',
}

/** Course / lesson difficulty (Implementation Plan §3.2). */
export enum CourseDifficulty {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

/** Lesson kind (Implementation Plan §3.2). */
export enum LessonKind {
  VIDEO = 'VIDEO',
  TEXT = 'TEXT',
  CONCEPT_REEL = 'CONCEPT_REEL',
}

// ─── Question bank (Sprint 3) ────────────────────────────────────────────────

/** Question type (Implementation Plan §3.3). */
export enum QuestionType {
  MCQ = 'MCQ',
  MULTI_SELECT = 'MULTI_SELECT',
  NUMERIC = 'NUMERIC',
  CODING = 'CODING',
}

/** Question difficulty (Implementation Plan §3.3). */
export enum QuestionDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

/** Question lifecycle status (Implementation Plan §3.3). */
export enum QuestionStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

// ─── Mock tests (Sprint 4) ───────────────────────────────────────────────────

/** Mock attempt lifecycle (Implementation Plan §3.3). */
export enum MockAttemptStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  EXPIRED = 'EXPIRED',
}
