/**
 * SHARED CONTRACT - DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo. Change both together.
 *
 * Marketing content CMS (Phase 5): blog posts + testimonials. Admin write DTOs
 * are validated by the backend ValidationPipe; the frontend imports the classes
 * `import type`. Read shapes are plain interfaces consumed by the public sites.
 */
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** http/https URLs only - blocks javascript:/data: injection in image src. */
const URL_OPTS = { require_protocol: true, protocols: ['http', 'https'] };

export type BlogStatusValue = 'DRAFT' | 'PUBLISHED';

// ─── Blog posts ──────────────────────────────────────────────────────────────

export class CreateBlogPostDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string | null;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  @IsUrl(URL_OPTS)
  @MaxLength(1000)
  coverUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  author?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED'])
  status?: BlogStatusValue;

  /** Also show on the public job pages ("Related reading"; default off). */
  @IsOptional()
  @IsBoolean()
  showOnJobs?: boolean;
}

export class UpdateBlogPostDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string | null;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  @IsUrl(URL_OPTS)
  @MaxLength(1000)
  coverUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  author?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED'])
  status?: BlogStatusValue;

  /** Also show on the public job pages ("Related reading"; default off). */
  @IsOptional()
  @IsBoolean()
  showOnJobs?: boolean;
}

export interface BlogPostDto {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  coverUrl: string | null;
  author: string | null;
  tags: string[];
  status: BlogStatusValue;
  showOnJobs: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Testimonials ────────────────────────────────────────────────────────────

export class CreateTestimonialDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  authorName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  authorTitle?: string | null;

  @IsOptional()
  @IsString()
  @IsUrl(URL_OPTS)
  @MaxLength(1000)
  avatarUrl?: string | null;

  /** Full designed graphic; rendered full-width in place of the quote card when set. */
  @IsOptional()
  @IsString()
  @IsUrl(URL_OPTS)
  @MaxLength(1000)
  imageUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  quote?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number | null;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  /** Also show on the public job pages (default off - homepage only). */
  @IsOptional()
  @IsBoolean()
  showOnJobs?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateTestimonialDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  authorName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  authorTitle?: string | null;

  @IsOptional()
  @IsString()
  @IsUrl(URL_OPTS)
  @MaxLength(1000)
  avatarUrl?: string | null;

  @IsOptional()
  @IsString()
  @IsUrl(URL_OPTS)
  @MaxLength(1000)
  imageUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  quote?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number | null;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  /** Also show on the public job pages (default off - homepage only). */
  @IsOptional()
  @IsBoolean()
  showOnJobs?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export interface TestimonialDto {
  id: string;
  authorName: string;
  authorTitle: string | null;
  avatarUrl: string | null;
  imageUrl: string | null;
  quote: string;
  rating: number | null;
  isPublished: boolean;
  showOnJobs: boolean;
  sortOrder: number;
  createdAt: string;
}

// --- Placement records ---------------------------------------------------------
// "This student got placed at this company for this package." A structural sibling
// of a testimonial - no quote; the package is the hero. Attached to a job posting.

export class CreatePlacementRecordDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  studentName!: string;

  @IsOptional()
  @IsString()
  @IsUrl(URL_OPTS)
  @MaxLength(1000)
  avatarUrl?: string | null;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  company!: string;

  @IsOptional()
  @IsString()
  @IsUrl(URL_OPTS)
  @MaxLength(1000)
  companyLogoUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  role?: string | null;

  /** Display string, rendered verbatim: "₹12 LPA", "12.5 LPA". */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  packageLabel?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  batch?: string | null;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdatePlacementRecordDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  studentName?: string;

  @IsOptional()
  @IsString()
  @IsUrl(URL_OPTS)
  @MaxLength(1000)
  avatarUrl?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  company?: string;

  @IsOptional()
  @IsString()
  @IsUrl(URL_OPTS)
  @MaxLength(1000)
  companyLogoUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  role?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  packageLabel?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  batch?: string | null;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export interface PlacementRecordDto {
  id: string;
  studentName: string;
  avatarUrl: string | null;
  company: string;
  companyLogoUrl: string | null;
  role: string | null;
  packageLabel: string | null;
  batch: string | null;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
}
