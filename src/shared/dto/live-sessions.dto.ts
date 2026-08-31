/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo. Change both together.
 *
 * Live sessions — admin-scheduled Zoom/Meet events targeted at students
 * (whole platform, or one company's registered students). The frontend imports
 * the request classes with `import type` and the response interfaces for typing.
 */
import {
  IsBoolean,
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
import { LiveSessionAudience, LiveSessionSignupKind } from '../enums';

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

  /** Where a student signs up when registration is hosted elsewhere (a form, a landing
   *  page). Optional: leave it empty and the in-app Register button handles it. */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  registrationUrl?: string | null;

  /** Admin-uploaded cover image (S3 public URL from the presign upload). */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  coverImageUrl?: string | null;

  /** Featured-speaker details (all optional). */
  @IsOptional()
  @IsString()
  @MaxLength(160)
  speakerName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  speakerRole?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  speakerCompany?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  speakerBio?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  speakerAvatarUrl?: string | null;

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

  /** Scheduling and notifying are INDEPENDENT: creating a session no longer notifies
   *  anyone by default. Set true to also fan out one in-app notification now; either way
   *  the admin can send (repeatable, scoped) notifications later via the Notify action. */
  @IsOptional()
  @IsBoolean()
  notifyOnCreate?: boolean;
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
  @IsString()
  @MaxLength(1000)
  registrationUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  coverImageUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  speakerName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  speakerRole?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  speakerCompany?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  speakerBio?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  speakerAvatarUrl?: string | null;

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
  meetingUrl: string | null;
  /** Separate from the join link on purpose: registration collects the lead, joining
   *  runs the session. An admin may host registration anywhere; null falls back to the
   *  in-app Register action. */
  registrationUrl: string | null;
  /** This student's own signal for this session, or null if they have not raised a
   *  hand. Drives the Register / I'm Interested control. */
  signupKind: LiveSessionSignupKind | null;
  /** True when THIS student must register before the join link is released - i.e. they
   *  hold no paid plan. Paying students are never required to register; they are only
   *  invited to express interest, which never gates access. */
  mustRegister: boolean;
  /** Admin view only: how many free students registered, and how many paying students
   *  said they were interested. */
  registeredCount?: number;
  interestedCount?: number;
  recordingUrl: string | null;
  coverImageUrl: string | null;
  speakerName: string | null;
  speakerRole: string | null;
  speakerCompany: string | null;
  speakerBio: string | null;
  speakerAvatarUrl: string | null;
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
