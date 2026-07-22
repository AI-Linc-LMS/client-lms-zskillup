/**
 * SHARED CONTRACT - DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo. Change both together.
 *
 * Resume Builder persistence. `data` is the full editor state (ResumeData) stored
 * opaquely as JSON - the shape lives in the frontend resume module; the backend
 * only guarantees it is an object.
 */
import { IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SaveResumeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(40)
  template!: string;

  @IsObject()
  data!: Record<string, unknown>;
}

export class UpdateResumeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  template?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}

export interface ResumeSummaryDto {
  id: string;
  title: string;
  template: string;
  updatedAt: string;
  createdAt: string;
}

export interface ResumeDetailDto extends ResumeSummaryDto {
  data: Record<string, unknown>;
}
