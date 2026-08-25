/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo. Change both together.
 *
 * The student calendar: everything with a date on it, in one list.
 */
import { IsDateString, IsOptional } from 'class-validator';

export enum CalendarEventKind {
  LIVE_SESSION = 'LIVE_SESSION',
  ASSESSMENT = 'ASSESSMENT',
  JOB_DEADLINE = 'JOB_DEADLINE',
}

export interface CalendarEventDto {
  id: string;
  kind: CalendarEventKind;
  title: string;
  /** Where clicking it goes. */
  href: string;
  startsAt: string;
  /** Null for a deadline, which is an instant rather than a span. */
  endsAt: string | null;
  /** One line of context under the title - the company, the host, the duration. */
  subtitle: string | null;
  /** True once the student has registered / marked interest / applied. Drives the
   *  "you're in" tick rather than a second lookup per row. */
  committed: boolean;
}

export class CalendarRangeQuery {
  /** Inclusive ISO date/datetime. Defaults to the start of the current month. */
  @IsOptional()
  @IsDateString()
  from?: string;

  /** Inclusive. Defaults to three months out - far enough for a term, close enough
   *  that a student is not scrolling through an empty year. */
  @IsOptional()
  @IsDateString()
  to?: string;
}
