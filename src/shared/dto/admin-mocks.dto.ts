/**
 * SHARED CONTRACT - DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at backend-repo/src/shared/dto/admin-mocks.dto.ts.
 *
 * Sprint 4 - Superadmin mock-test CRUD ("Mock test definitions" in the plan).
 *
 * A mock is an ordered set of PUBLISHED questions taken under a server-enforced
 * timer. The service validates that every `questionId` exists and is published
 * (that check needs DB access, so it lives in MocksAdminService, not here).
 */
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class AdminCreateMockDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsUUID()
  companyId?: string | null;

  @IsInt()
  @Min(1)
  @Max(300)
  durationMinutes!: number;

  @IsInt()
  @Min(0)
  @Max(100)
  passingScore!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  questionIds!: string[];
}

/** Patch - all fields optional; supplying `questionIds` replaces the whole set. */
export class AdminUpdateMockDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(300)
  durationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  passingScore?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  questionIds?: string[];
}
