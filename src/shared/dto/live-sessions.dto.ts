/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo. Change both together.
 *
 * Live sessions — admin-scheduled Zoom/Meet events targeted at students
 * (whole platform, or one company's registered students). The frontend imports
 * the request classes with `import type` and the response interfaces for typing.
 */
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { LiveSessionAudience } from '../enums';

// ── Requests ────────────────────────────────────────────────────────────────

export class CreateLiveSessionDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsString()
  @MaxLength(1000)
  meetingUrl!: string;

  /** Optional playback link (add after the session so students can watch back). */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  recordingUrl?: string | null;

  /** ISO timestamp for when the session starts. */
  @IsDateString()
  scheduledAt!: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(600)
  durationMinutes?: number;

  @IsEnum(LiveSessionAudience)
  audience!: LiveSessionAudience;

  /** Required when audience = COMPANY; ignored otherwise. */
  @IsOptional()
  @IsUUID()
  companyId?: string | null;
}

export class UpdateLiveSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  meetingUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  recordingUrl?: string | null;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(600)
  durationMinutes?: number;

  @IsOptional()
  @IsEnum(LiveSessionAudience)
  audience?: LiveSessionAudience;

  @IsOptional()
  @IsUUID()
  companyId?: string | null;
}

// ── Responses ───────────────────────────────────────────────────────────────

export type LiveSessionStatus = 'UPCOMING' | 'LIVE' | 'ENDED';

export interface LiveSessionDto {
  id: string;
  title: string;
  description: string;
  meetingUrl: string;
  recordingUrl: string | null;
  scheduledAt: string;
  durationMinutes: number;
  audience: LiveSessionAudience;
  companyId: string | null;
  companyName: string | null;
  hostName: string;
  status: LiveSessionStatus;
  /** Registered-student count reached (admin view only; 0 for students). */
  reachCount?: number;
  createdAt: string;
}

export interface LiveSessionListDto {
  upcoming: LiveSessionDto[];
  past: LiveSessionDto[];
}
