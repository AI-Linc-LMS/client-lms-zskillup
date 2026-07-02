/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo. Change both together.
 *
 * Super-admin user-account operations (Phase 2). The frontend imports these
 * classes with `import type` so the class-validator runtime never fires
 * client-side; the backend's global ValidationPipe enforces them. (No
 * `@nestjs/swagger` here — it is not a frontend dependency, matching the other
 * mirrored DTOs.)
 */
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/** Edit a user's editable profile fields (SUPER_ADMIN). Role has its own endpoint. */
export class AdminUpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fullName?: string | null;

  @IsOptional()
  @IsUUID()
  collegeId?: string | null;

  @IsOptional()
  @IsUUID()
  cohortId?: string | null;
}

/**
 * Set per-ADMIN capability flags (SUPER_ADMIN). Omitted flags are left unchanged;
 * only the provided booleans are applied.
 */
export class UpdateAdminCapabilitiesDto {
  @IsOptional()
  @IsBoolean()
  canDeleteStudents?: boolean;

  @IsOptional()
  @IsBoolean()
  canManageSubscriptions?: boolean;

  @IsOptional()
  @IsBoolean()
  canBroadcast?: boolean;

  @IsOptional()
  @IsBoolean()
  canViewFinancials?: boolean;
}
