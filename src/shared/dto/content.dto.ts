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

  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  quote!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number | null;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

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
  @MinLength(3)
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

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export interface TestimonialDto {
  id: string;
  authorName: string;
  authorTitle: string | null;
  avatarUrl: string | null;
  quote: string;
  rating: number | null;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
}
