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

/**
 * What a college's subscription unlocks for its students. Exactly ONE kind per
 * college (enforced by DTO + a DB CHECK):
 *   PLATFORM — the whole platform; every company and premium surface.
 *   COMPANY  — a chosen set of company hubs (1..50 slugs); everything else stays locked.
 * Projected into `subject_type='COLLEGE'` rows in billing.entitlements, which every
 * student of the college inherits at read time.
 */
export enum CollegeSubscriptionKind {
  PLATFORM = 'PLATFORM',
  COMPANY = 'COMPANY',
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


/** How often a question has appeared in real company assessments (Framework §Metadata). */
export enum QuestionFrequency {
  VERY_HIGH = 'VERY_HIGH',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

/** Origin / provenance of a question (Framework §Metadata). */
export enum QuestionSource {
  PYQ = 'PREVIOUS_YEAR_QUESTIONS',
  MEMORY_BASED = 'MEMORY_BASED',
  PATTERN_BASED = 'PATTERN_BASED',
  MOCK_DERIVED = 'MOCK_DERIVED',
  AI_GENERATED = 'AI_GENERATED',
}

/** Per-company relevance weight for a question (Framework §Company Mapping). */
export enum CompanyImportance {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

/** Which content surfaces a question is approved for (Framework §Content Mapping). */
export enum ContentUsageType {
  CONCEPT_VIDEO = 'CONCEPT_VIDEO',
  SOLUTION_VIDEO = 'SOLUTION_VIDEO',
  QUIZ = 'QUIZ',
  MOCK_ASSESSMENT = 'MOCK_ASSESSMENT',
  REVISION = 'REVISION',
}

/** Lifecycle of a single mock-test attempt (Sprint 4 — mock engine). */
export enum MockAttemptStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  EXPIRED = 'EXPIRED',
}

/** Student ↔ company drive registration lifecycle. */
export enum RegistrationStatus {
  REGISTERED = 'REGISTERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// ─── Gamification (Sprint 5) ─────────────────────────────────────────────────

/** What produced a ledger entry (IMPLEMENTATION_PLAN §3.4). Append-only audit. */
export enum XpSource {
  PRACTICE = 'PRACTICE',
  MOCK = 'MOCK',
  DAILY_QUEST = 'DAILY_QUEST',
  DAILY_CHALLENGE = 'DAILY_CHALLENGE',
  CHALLENGE = 'CHALLENGE',
  CODING = 'CODING',
  ROADMAP_STEP = 'ROADMAP_STEP',
  STREAK_BONUS = 'STREAK_BONUS',
  BADGE = 'BADGE',
  ADMIN_ADJUST = 'ADMIN_ADJUST',
}

/** A challenge can be sourced from the bank (MCQ), require code (CODING), or be
 *  a free-form admin-defined task (OTHER). CODING execution lands with Judge0. */
export enum ChallengeType {
  MCQ = 'MCQ',
  CODING = 'CODING',
  OTHER = 'OTHER',
}

/** Per-student challenge state. */
export enum ChallengeStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
}

/** Daily-challenge lifecycle. */
export enum DailyChallengeStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  MISSED = 'MISSED',
}

/** Ledger currency — XP and coins share one append-only ledger (SPRINT_5_DESIGN §15 C3). */
export enum LedgerCurrency {
  XP = 'XP',
  COINS = 'COINS',
}

/** A daily quest is satisfied by either a practice question or a mock. */
export enum DailyQuestKind {
  PRACTICE = 'PRACTICE',
  MOCK = 'MOCK',
}

/** Daily quest lifecycle (nightly sweep flips stale PENDING → MISSED). */
export enum DailyQuestStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  MISSED = 'MISSED',
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

/** A Razorpay order (one purchasable line) lifecycle. EXPIRED is an abandoned
 *  checkout (CREATED but never paid), swept lazily so 'pending' stays bounded. */
export enum PaymentOrderStatus {
  CREATED = 'CREATED',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  EXPIRED = 'EXPIRED',
}

/** A captured Razorpay payment lifecycle. */
export enum PaymentStatus {
  CREATED = 'CREATED',
  CAPTURED = 'CAPTURED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

/** Kinds of community post (smaller subset of the AI-LINC forum). */
export enum CommunityPostType {
  DISCUSSION = 'DISCUSSION',
  QUESTION = 'QUESTION',
  RESOURCE = 'RESOURCE',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
}

/** Lifecycle of a job posting. CLOSED keeps the page reachable (shared links stay
 *  valid) while making clear no further applications are wanted. */
export enum JobStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CLOSED = 'CLOSED',
}

/** Where a student's job application stands. Frozen at five values by the owner;
 *  the admin moves an application through them and each move can email the student. */
export enum JobApplicationStatus {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  SHORTLISTED = 'SHORTLISTED',
  HIRED = 'HIRED',
  REJECTED = 'REJECTED',
}

/** Where the work happens. The one filter every job board needs and free-text
 *  `location` cannot serve. */
export enum WorkMode {
  ONSITE = 'ONSITE',
  HYBRID = 'HYBRID',
  REMOTE = 'REMOTE',
}

/** How a student raised their hand for a live session. REGISTERED is the free-user
 *  requirement before the join link is released; INTERESTED is a paying user's
 *  optional signal that must never gate access. */
export enum LiveSessionSignupKind {
  REGISTERED = 'REGISTERED',
  INTERESTED = 'INTERESTED',
}

/** Who a live session is for. */
export enum LiveSessionAudience {
  PLATFORM = 'PLATFORM',
  COMPANY = 'COMPANY',
}
