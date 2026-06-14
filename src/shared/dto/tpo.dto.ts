/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011, amended 2026-06-03).
 * Mirrored at frontend-repo/src/shared/dto/tpo.dto.ts.
 *
 * TPO endpoints (Implementation Plan §4). v1 ships the bulk-invite flow;
 * dashboard + at-risk + reports land in Sprint 7 once PPS is computable.
 *
 * Sprint 1 — TPO bulk-invite by CSV. The wire format is plain rows so the
 * frontend can upload a CSV directly; we sanitize against CSV injection
 * server-side (SECURITY_STANDARDS §4 — leading `=`, `+`, `@`, `-` is escaped).
 */
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

const normaliseEmail = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class TpoInvitationRowDto {
  // Email FORMAT is validated per-row inside TpoService (not via @IsEmail) so a
  // single malformed CSV row is reported as `invalid` rather than 400-ing the
  // whole batch — bulk CSV uploads routinely contain a few bad rows.
  @Transform(normaliseEmail)
  @IsString()
  @MaxLength(254)
  email!: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(50)
  rollNumber?: string;
}

export class TpoBulkInviteDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Add at least one student' })
  @ArrayMaxSize(500, { message: 'Upload up to 500 students per batch' })
  @ValidateNested({ each: true })
  @Type(() => TpoInvitationRowDto)
  invitations!: TpoInvitationRowDto[];
}

export interface TpoBulkInviteResult {
  /** Number of new invitations created. */
  created: number;
  /** Number skipped because the email is already registered (any role). */
  skipped: number;
  /** Per-row outcome for client-side reporting. */
  rows: Array<{
    email: string;
    status: 'created' | 'skipped' | 'invalid';
    reason?: string;
  }>;
}
