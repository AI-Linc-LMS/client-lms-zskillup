/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo. Change both together.
 *
 * Notifying people ABOUT something, on the admin's schedule rather than the thing's.
 */
import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export const ENTITY_NOTIFY_TYPES = ['LIVE_SESSION', 'SCHEDULED_ASSESSMENT', 'JOB_POSTING'] as const;
export type EntityNotifyType = (typeof ENTITY_NOTIFY_TYPES)[number];

export const ENTITY_NOTIFY_SCOPES = ['PLATFORM', 'COLLEGE', 'COHORT'] as const;
export type EntityNotifyScope = (typeof ENTITY_NOTIFY_SCOPES)[number];

export class SendEntityNotificationDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body!: string;

  @IsIn(ENTITY_NOTIFY_SCOPES as unknown as string[])
  scope!: EntityNotifyScope;

  @IsOptional()
  @IsUUID()
  collegeId?: string;

  @IsOptional()
  @IsUUID()
  cohortId?: string;
}

/** One past send, so an admin can see what they have already told people. */
export interface EntityNotificationSendDto {
  id: string;
  scope: EntityNotifyScope;
  title: string;
  body: string;
  recipients: number;
  sentAt: string;
  sentByName: string | null;
}
