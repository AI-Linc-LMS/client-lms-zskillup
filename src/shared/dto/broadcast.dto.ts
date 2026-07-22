/**
 * SHARED CONTRACT - DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo. Change both together.
 *
 * Admin broadcast notifications (Phase 3). A SUPER_ADMIN (or an ADMIN holding the
 * canBroadcast capability) sends an in-app notification to a target audience.
 * Fans out one `system.notifications` row per recipient. `import type` on the
 * frontend so the class-validator runtime never fires client-side.
 */
import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

/** Who receives the broadcast. */
export type BroadcastScope = 'PLATFORM' | 'COLLEGE' | 'COHORT';
export const BROADCAST_SCOPES: BroadcastScope[] = ['PLATFORM', 'COLLEGE', 'COHORT'];

export class CreateBroadcastDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  body!: string;

  /** Optional deep-link the notification opens (e.g. /assessments). */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  link?: string | null;

  @IsIn(BROADCAST_SCOPES)
  scope!: BroadcastScope;

  /** Required when scope === 'COLLEGE'. */
  @IsOptional()
  @IsUUID()
  collegeId?: string;

  /** Required when scope === 'COHORT'. */
  @IsOptional()
  @IsUUID()
  cohortId?: string;
}

/** Result of a broadcast send. */
export interface BroadcastResultDto {
  recipients: number;
  scope: BroadcastScope;
}
