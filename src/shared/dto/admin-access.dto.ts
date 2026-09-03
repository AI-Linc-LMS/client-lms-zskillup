/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at frontend-repo/src/shared/dto/admin-access.dto.ts.
 *
 * Admin ↔ college portfolio (TPO Panel View, true 3-tier hierarchy). A SUPER_ADMIN
 * assigns a set of colleges to an ADMIN; that admin is then scoped to those colleges
 * across the console. An admin with NO assignments sees ALL colleges (backward
 * compatible). The frontend imports these with `import type`.
 */
import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';

/** Replace an admin's assigned colleges with this exact set (empty = clear → the
 *  admin reverts to all-colleges). */
export class SetAdminCollegesDto {
  @IsArray()
  @ArrayMaxSize(5000)
  @IsUUID('all', { each: true })
  collegeIds!: string[];
}

/** One ADMIN + the colleges they're scoped to (empty = all-colleges). */
export interface AdminAssignmentDto {
  adminId: string;
  name: string | null;
  email: string;
  collegeIds: string[];
}
