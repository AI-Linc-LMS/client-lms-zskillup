/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at frontend-repo/src/shared/dto/admin-catalog.dto.ts.
 */
import { z } from 'zod';
import { CompanyType, CourseCategory, CourseDifficulty, LessonKind } from '../enums';

const slugSchema = z
  .string()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9-]+$/, 'slug must be lowercase letters, digits, and dashes only');

// ─── Companies (Sprint 2 — superadmin CRUD) ─────────────────────────────────

export const adminCreateCompanySchema = z.object({
  slug: slugSchema,
  name: z.string().min(2).max(120),
  tagline: z.string().max(200).optional(),
  type: z.nativeEnum(CompanyType),
  logoUrl: z.string().url().max(500).optional(),
  brandColor: z.string().max(20).optional(),
  accent: z.string().max(120).optional(),
  description: z.string().max(5000).optional(),
  badge: z.string().max(60).optional(),
  displayOrder: z.number().int().min(0).max(1000).default(0),
  isPublished: z.boolean().default(true),
});
export type AdminCreateCompanyDto = z.infer<typeof adminCreateCompanySchema>;

export const adminUpdateCompanySchema = adminCreateCompanySchema.partial();
export type AdminUpdateCompanyDto = z.infer<typeof adminUpdateCompanySchema>;

// ─── Courses (Sprint 2 — superadmin CRUD) ───────────────────────────────────

export const adminCreateCourseSchema = z.object({
  slug: slugSchema,
  title: z.string().min(2).max(200),
  summary: z.string().max(5000).optional(),
  coverUrl: z.string().url().max(500).optional(),
  category: z.nativeEnum(CourseCategory),
  difficulty: z.nativeEnum(CourseDifficulty).default(CourseDifficulty.INTERMEDIATE),
  estimatedHours: z.number().int().min(0).max(500).default(0),
  isPublished: z.boolean().default(false),
});
export type AdminCreateCourseDto = z.infer<typeof adminCreateCourseSchema>;

export const adminUpdateCourseSchema = adminCreateCourseSchema.partial();
export type AdminUpdateCourseDto = z.infer<typeof adminUpdateCourseSchema>;

// ─── Colleges (Sprint 0 exit — superadmin can create a college) ──────────────

export const adminCreateCollegeSchema = z.object({
  name: z.string().min(2).max(200),
  slug: slugSchema,
  state: z.string().min(2).max(100),
  city: z.string().min(2).max(100),
});
export type AdminCreateCollegeDto = z.infer<typeof adminCreateCollegeSchema>;

// ─── Course modules + lessons (Sprint 2 — superadmin authoring) ─────────────

export const adminCreateModuleSchema = z.object({
  courseSlug: slugSchema,
  title: z.string().min(2).max(200),
  summary: z.string().max(5000).optional(),
  orderIndex: z.number().int().min(0).max(1000).default(0),
});
export type AdminCreateModuleDto = z.infer<typeof adminCreateModuleSchema>;

export const adminUpdateModuleSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  summary: z.string().max(5000).nullable().optional(),
  orderIndex: z.number().int().min(0).max(1000).optional(),
});
export type AdminUpdateModuleDto = z.infer<typeof adminUpdateModuleSchema>;

const lessonKindSchema = z.nativeEnum(LessonKind);

export const adminCreateLessonSchema = z.object({
  moduleId: z.string().uuid(),
  title: z.string().min(2).max(200),
  kind: lessonKindSchema.default(LessonKind.VIDEO),
  durationMinutes: z.number().int().min(0).max(600).default(0),
  videoProviderId: z.string().max(200).optional(),
  body: z.string().max(50000).optional(),
  orderIndex: z.number().int().min(0).max(1000).default(0),
  isFree: z.boolean().default(false),
});
export type AdminCreateLessonDto = z.infer<typeof adminCreateLessonSchema>;

export const adminUpdateLessonSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  kind: lessonKindSchema.optional(),
  durationMinutes: z.number().int().min(0).max(600).optional(),
  videoProviderId: z.string().max(200).nullable().optional(),
  body: z.string().max(50000).nullable().optional(),
  orderIndex: z.number().int().min(0).max(1000).optional(),
  isFree: z.boolean().optional(),
});
export type AdminUpdateLessonDto = z.infer<typeof adminUpdateLessonSchema>;
