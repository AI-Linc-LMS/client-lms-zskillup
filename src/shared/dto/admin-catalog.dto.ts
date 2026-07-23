/**
 * SHARED CONTRACT - DUPLICATED ACROSS BOTH REPOS (ADR-011, amended 2026-06-03).
 * Mirrored at frontend-repo/src/shared/dto/admin-catalog.dto.ts.
 *
 * Superadmin catalog CRUD - companies, courses, colleges, modules, lessons
 * (Implementation Plan §4: `/admin/colleges`, `/admin/companies`, `/admin/courses`).
 */
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  CollegeStatus,
  CompanyType,
  CourseCategory,
  CourseDifficulty,
  LessonKind,
} from '../enums';

const SLUG_REGEX = /^[a-z0-9-]+$/;
const SLUG_RULE = {
  message: 'slug must be lowercase letters, digits, and dashes only',
};

// ─── Companies (Sprint 2 - superadmin CRUD) ─────────────────────────────────

export class AdminCreateCompanyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(SLUG_REGEX, SLUG_RULE)
  slug!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tagline?: string;

  @IsEnum(CompanyType)
  type!: CompanyType;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  brandColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  accent?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  badge?: string;

  // Card metadata (explorer grid / hub hero) - display-only catalog copy.
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(5) rating?: number;
  @IsOptional() @IsString() @MaxLength(20) enrolled?: string;
  @IsOptional() @IsString() @MaxLength(40) package?: string;
  @IsOptional() @IsString() @MaxLength(12) difficulty?: string;
  @IsOptional() @IsString() @MaxLength(20) mcqs?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(20) rounds?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  displayOrder: number = 0;

  @IsBoolean()
  isPublished: boolean = true;
}

/** Patch - every field optional, all rules from create still apply when present. */
export class AdminUpdateCompanyDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) @Matches(SLUG_REGEX, SLUG_RULE)
  slug?: string;

  @IsOptional() @IsString() @MinLength(2) @MaxLength(120)
  name?: string;

  @IsOptional() @IsString() @MaxLength(200)
  tagline?: string;

  @IsOptional() @IsEnum(CompanyType)
  type?: CompanyType;

  @IsOptional() @IsUrl() @MaxLength(500)
  logoUrl?: string;

  @IsOptional() @IsString() @MaxLength(20)
  brandColor?: string;

  @IsOptional() @IsString() @MaxLength(120)
  accent?: string;

  @IsOptional() @IsString() @MaxLength(5000)
  description?: string;

  @IsOptional() @IsString() @MaxLength(60)
  badge?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1000)
  displayOrder?: number;

  @IsOptional() @IsBoolean()
  isPublished?: boolean;

  // Card metadata (explorer grid / hub hero) - display-only catalog copy.
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(5) rating?: number;
  @IsOptional() @IsString() @MaxLength(20) enrolled?: string;
  @IsOptional() @IsString() @MaxLength(40) package?: string;
  @IsOptional() @IsString() @MaxLength(12) difficulty?: string;
  @IsOptional() @IsString() @MaxLength(20) mcqs?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(20) rounds?: number;
}

// ─── Company hub content (7-tab body) ───────────────────────────────────────

/** Upsert the per-company hub body. Sections are JSON; validated structurally
 *  (objects/arrays) since the inner shape is the frontend HubContent contract. */
export class AdminUpsertCompanyHubDto {
  @IsObject() overview!: Record<string, unknown>;
  @IsObject() quickStats!: Record<string, unknown>;
  @IsArray() syllabus!: unknown[];
  @IsArray() material!: unknown[];
  @IsArray() quizzes!: unknown[];
  @IsArray() mocks!: unknown[];
  @IsArray() formulaSheets!: unknown[];
  @IsArray() interviews!: unknown[];
}

/** Set (or clear) the Company Hub intro video — a pasted Vimeo / Google Drive /
 *  YouTube link. Empty string clears it. Stored on the hub overview; the public
 *  DTO derives the embeddable `introEmbedUrl` server-side. */
export class SetCompanyIntroVideoDto {
  @IsString()
  @MaxLength(500)
  introVideoUrl!: string;
}

// ─── Courses (Sprint 2 - superadmin CRUD) ───────────────────────────────────

export class AdminCreateCourseDto {
  @IsString() @MinLength(2) @MaxLength(120) @Matches(SLUG_REGEX, SLUG_RULE)
  slug!: string;

  @IsString() @MinLength(2) @MaxLength(200)
  title!: string;

  @IsOptional() @IsString() @MaxLength(5000)
  summary?: string;

  @IsOptional() @IsUrl() @MaxLength(500)
  coverUrl?: string;

  @IsEnum(CourseCategory)
  category!: CourseCategory;

  @IsEnum(CourseDifficulty)
  difficulty: CourseDifficulty = CourseDifficulty.INTERMEDIATE;

  @Type(() => Number) @IsInt() @Min(0) @Max(500)
  estimatedHours: number = 0;

  @IsBoolean()
  isPublished: boolean = false;
}

export class AdminUpdateCourseDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) @Matches(SLUG_REGEX, SLUG_RULE)
  slug?: string;

  @IsOptional() @IsString() @MinLength(2) @MaxLength(200)
  title?: string;

  @IsOptional() @IsString() @MaxLength(5000)
  summary?: string;

  @IsOptional() @IsUrl() @MaxLength(500)
  coverUrl?: string;

  @IsOptional() @IsEnum(CourseCategory)
  category?: CourseCategory;

  @IsOptional() @IsEnum(CourseDifficulty)
  difficulty?: CourseDifficulty;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(500)
  estimatedHours?: number;

  @IsOptional() @IsBoolean()
  isPublished?: boolean;
}

// ─── Colleges (Sprint 0 exit - superadmin can create a college) ─────────────

export class AdminCreateCollegeDto {
  @IsString() @MinLength(2) @MaxLength(200)
  name!: string;

  @IsString() @MinLength(2) @MaxLength(120) @Matches(SLUG_REGEX, SLUG_RULE)
  slug!: string;

  @IsString() @MinLength(2) @MaxLength(100)
  state!: string;

  @IsString() @MinLength(2) @MaxLength(100)
  city!: string;
}

/**
 * Patch a college - every field optional. `status` lets a superadmin suspend a
 * tenant without deleting it (Sprint 8 / SECURITY_STANDARDS §6). Slug change
 * checks for uniqueness server-side.
 */
export class AdminUpdateCollegeDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(200)
  name?: string;

  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) @Matches(SLUG_REGEX, SLUG_RULE)
  slug?: string;

  @IsOptional() @IsString() @MinLength(2) @MaxLength(100)
  state?: string;

  @IsOptional() @IsString() @MinLength(2) @MaxLength(100)
  city?: string;

  @IsOptional() @IsEnum(CollegeStatus)
  status?: CollegeStatus;
}

// ─── Course modules + lessons (Sprint 2 - superadmin authoring) ─────────────

export class AdminCreateModuleDto {
  @IsString() @MinLength(2) @MaxLength(120) @Matches(SLUG_REGEX, SLUG_RULE)
  courseSlug!: string;

  @IsString() @MinLength(2) @MaxLength(200)
  title!: string;

  @IsOptional() @IsString() @MaxLength(5000)
  summary?: string;

  @Type(() => Number) @IsInt() @Min(0) @Max(1000)
  orderIndex: number = 0;
}

export class AdminUpdateModuleDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(200)
  title?: string;

  @IsOptional() @IsString() @MaxLength(5000)
  summary?: string | null;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1000)
  orderIndex?: number;
}

export class AdminCreateLessonDto {
  @IsUUID()
  moduleId!: string;

  @IsString() @MinLength(2) @MaxLength(200)
  title!: string;

  @IsEnum(LessonKind)
  kind: LessonKind = LessonKind.VIDEO;

  @Type(() => Number) @IsInt() @Min(0) @Max(600)
  durationMinutes: number = 0;

  @IsOptional() @IsString() @MaxLength(200)
  videoProviderId?: string;

  @IsOptional() @IsString() @MaxLength(50000)
  body?: string;

  @Type(() => Number) @IsInt() @Min(0) @Max(1000)
  orderIndex: number = 0;

  @IsBoolean()
  isFree: boolean = false;
}

export class AdminUpdateLessonDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(200)
  title?: string;

  @IsOptional() @IsEnum(LessonKind)
  kind?: LessonKind;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(600)
  durationMinutes?: number;

  @IsOptional() @IsString() @MaxLength(200)
  videoProviderId?: string | null;

  @IsOptional() @IsString() @MaxLength(50000)
  body?: string | null;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1000)
  orderIndex?: number;

  @IsOptional() @IsBoolean()
  isFree?: boolean;
}
