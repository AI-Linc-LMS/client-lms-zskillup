/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011, amended 2026-06-03).
 * Mirrored byte-for-byte at the same path in frontend-repo/src/shared.
 *
 * Validation engine: class-validator + class-transformer (Implementation Plan
 * §4 line 311 — chosen alternative to Zod). The DTO classes carry the
 * decorators; the backend's global ValidationPipe wires them in. The frontend
 * imports each class `import type` so the decorator runtime never fires
 * client-side; forms use react-hook-form native rules with the same
 * constraints.
 */
export * from './enums';
export * from './admin-capabilities';
export * from './api';
export * from './dto/auth.dto';
export * from './dto/onboarding.dto';
export * from './dto/practice.dto';
export * from './dto/admin-questions.dto';
export * from './dto/admin-catalog.dto';
export * from './dto/me.dto';
export * from './dto/tpo.dto';
export * from './dto/college-request.dto';
export * from './dto/cohort.dto';
export * from './dto/tpo-analytics.dto';
export * from './dto/admin-users.dto';
export * from './dto/broadcast.dto';
export * from './dto/subscription.dto';
export * from './dto/content.dto';
export * from './dto/support.dto';
export * from './dto/financials.dto';
export * from './dto/resume.dto';
