/**
 * SHARED CONTRACT - DUPLICATED ACROSS BOTH REPOS (ADR-011, amended 2026-06-03).
 * Mirrored at frontend-repo/src/shared/dto/me.dto.ts.
 *
 * Patch the authenticated user's mutable profile fields. Email + role + status
 * are NOT mutable here (admin-only changes elsewhere). passwordHash is never
 * exposed. Unknown fields are rejected by the global ValidationPipe
 * (`forbidNonWhitelisted: true`).
 */
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  fullName?: string;
}
