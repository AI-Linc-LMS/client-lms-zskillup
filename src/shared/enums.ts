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

/**
 * College onboarding request lifecycle (college/TPO onboarding).
 * Admin drafts → submits; Super Admin approves (creates the College) or rejects
 * (with a reason); Admin corrects a rejected request and resubmits.
 */
export enum CollegeRequestStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/** College subscription lifecycle (lightweight — no billing). */
export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
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

// ─── Billing & entitlements (Razorpay program) ───────────────────────────────

/**
 * What a purchase / grant unlocks — the entitlement scope.
 * - PLATFORM: everything (the "Upgrade Subscription" / full-generic plan).
 * - SECTION:  a whole practice section (scopeRef = section root slug, or 'coding').
 * - TOPIC:    a single topic (scopeRef = topic slug; coding topics use 'coding:<tag>').
 * - COMPANY:  one recruiter company's hub / PYQ bank (scopeRef = company slug).
 */
export enum EntitlementScope {
  PLATFORM = 'PLATFORM',
  SECTION = 'SECTION',
  TOPIC = 'TOPIC',
  COMPANY = 'COMPANY',
}

/** Billing period a price maps to. Duration in days is stored per price row. */
export enum BillingPeriod {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUAL = 'ANNUAL',
}

/**
 * Price tier. Only COMPANY scope is dual-tier today (Retail vs B2B); PLATFORM /
 * SECTION / TOPIC are priced at RETAIL only. The tier is decided by who pays:
 * an individual student → RETAIL, a college buying in bulk → B2B.
 */
export enum PriceTier {
  RETAIL = 'RETAIL',
  B2B = 'B2B',
}

/** Who a purchase / entitlement belongs to. */
export enum EntitlementSubject {
  USER = 'USER',
  COLLEGE = 'COLLEGE',
}

/** How an entitlement was created. */
export enum EntitlementSource {
  PURCHASE = 'PURCHASE',
  ADMIN_GRANT = 'ADMIN_GRANT',
  TRIAL = 'TRIAL',
  COLLEGE_INHERITED = 'COLLEGE_INHERITED',
}

/** Entitlement lifecycle. EXPIRED is derived at read time (expires_at < now),
 *  never persisted — mirrors the college-subscription lazy-expiry convention. */
export enum EntitlementStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
}

/** A Razorpay order (one purchasable line) lifecycle. */
export enum PaymentOrderStatus {
  CREATED = 'CREATED',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

/** A captured Razorpay payment lifecycle. */
export enum PaymentStatus {
  CREATED = 'CREATED',
  CAPTURED = 'CAPTURED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}
