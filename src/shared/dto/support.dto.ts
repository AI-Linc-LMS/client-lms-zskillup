/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo. Change both together.
 *
 * Support tickets (Phase 6). Users open tickets + reply; staff triage + reply.
 */
import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export type TicketStatusValue = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketPriorityValue = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export const TICKET_STATUSES: TicketStatusValue[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
export const TICKET_PRIORITIES: TicketPriorityValue[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

/** Open a ticket (creator = current user). */
export class CreateTicketDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  subject!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(5000)
  body!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string | null;
}

/** Post a reply on a ticket thread. */
export class CreateTicketMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;
}

/** Staff triage update. */
export class UpdateTicketDto {
  @IsOptional()
  @IsIn(TICKET_STATUSES)
  status?: TicketStatusValue;

  @IsOptional()
  @IsIn(TICKET_PRIORITIES)
  priority?: TicketPriorityValue;

  @IsOptional()
  @IsUUID()
  assignedTo?: string | null;
}

// ─── Read shapes ─────────────────────────────────────────────────────────────

export interface TicketMessageDto {
  id: string;
  authorId: string;
  authorName: string | null;
  body: string;
  isStaff: boolean;
  createdAt: string;
}

export interface TicketDto {
  id: string;
  userId: string;
  requesterName: string | null;
  requesterEmail: string | null;
  subject: string;
  category: string | null;
  status: TicketStatusValue;
  priority: TicketPriorityValue;
  assignedTo: string | null;
  lastMessageAt: string;
  createdAt: string;
}

export interface TicketDetailDto extends TicketDto {
  messages: TicketMessageDto[];
}
