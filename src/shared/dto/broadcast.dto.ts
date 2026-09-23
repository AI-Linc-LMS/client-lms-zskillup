/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo. Change both together.
 *
 * Admin broadcast notifications (Phase 3). A SUPER_ADMIN (or an ADMIN holding the
 * canBroadcast capability) sends an in-app notification to a target audience.
 * Fans out one `system.notifications` row per recipient. `import type` on the
 * frontend so the class-validator runtime never fires client-side.
 */
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Who receives the broadcast. */
export type BroadcastScope = 'PLATFORM' | 'COLLEGE' | 'COHORT';
export const BROADCAST_SCOPES: BroadcastScope[] = ['PLATFORM', 'COLLEGE', 'COHORT'];

/** How it reaches them. */
export type BroadcastChannel = 'IN_APP' | 'EMAIL' | 'BOTH';
export const BROADCAST_CHANNELS: BroadcastChannel[] = ['IN_APP', 'EMAIL', 'BOTH'];

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

  /** Defaults to IN_APP — what every caller before channels existed meant. */
  @IsOptional()
  @IsIn(BROADCAST_CHANNELS)
  channel?: BroadcastChannel;

  /**
   * An explicit recipient list (a pasted list, or a CSV the browser parsed), used
   * INSTEAD of the audience above.
   *
   * These are addresses, not accounts: one may belong to nobody on the platform.
   * An in-app notification needs an account to land on, so a listed address gets
   * the email, and the in-app copy only if it matches a real student.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5000)
  @IsEmail({}, { each: true })
  emails?: string[];

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
  /** In-app notifications actually created. */
  recipients: number;
  scope: BroadcastScope;
  channel: BroadcastChannel;
  /** Emails handed to the send queue. Delivery is asynchronous — this is what was
   *  accepted for sending, not what has landed. */
  emailsQueued: number;
  /** Listed addresses that match no student account: they get the email (an admin
   *  typed them deliberately) but can have no in-app copy. Reported so a typo in a
   *  pasted list is visible rather than silently swallowed. */
  unknownAddresses: number;
}
