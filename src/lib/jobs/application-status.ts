import { JobApplicationStatus } from '@/shared/enums';
import type { StatusTone } from '@/components/student/StatusPill';

/**
 * One place that turns an application status into words a student understands.
 *
 * Every status carries a `reason` as well as a label. A bare "Under review" makes a
 * student wonder what they are supposed to do next and whether the silence means
 * something bad; saying who is holding it, and what happens next, is the difference
 * between a status and an answer. The admin panel and the student's own list read
 * from this same map so the two can never describe the same row differently.
 */
export const APPLICATION_STATUS: Record<
  JobApplicationStatus,
  { label: string; tone: StatusTone; reason: string }
> = {
  [JobApplicationStatus.SUBMITTED]: {
    label: 'Submitted',
    tone: 'info',
    reason:
      'We have your application. Nobody has opened it yet - that is normal in the first few days.',
  },
  [JobApplicationStatus.UNDER_REVIEW]: {
    label: 'Under review',
    tone: 'info',
    reason:
      'Someone on the hiring side is reading your profile right now. Nothing is needed from you.',
  },
  [JobApplicationStatus.SHORTLISTED]: {
    label: 'Shortlisted',
    tone: 'warning',
    reason:
      'You made the shortlist. Expect an interview invite by email - keep an eye on your inbox.',
  },
  [JobApplicationStatus.INTERVIEW]: {
    label: 'Interviewing',
    tone: 'warning',
    reason:
      'You are through to interviews. Check your email for the invite and the round details.',
  },
  [JobApplicationStatus.HIRED]: {
    label: 'Hired',
    tone: 'positive',
    reason: 'You got the role. Congratulations.',
  },
  [JobApplicationStatus.REJECTED]: {
    label: 'Not selected',
    tone: 'negative',
    reason: 'They went with someone else this time. Your other applications are unaffected.',
  },
};

/** Statuses in the order an application actually travels, for the admin's dropdown. */
export const APPLICATION_STATUS_ORDER: JobApplicationStatus[] = [
  JobApplicationStatus.SUBMITTED,
  JobApplicationStatus.UNDER_REVIEW,
  JobApplicationStatus.SHORTLISTED,
  JobApplicationStatus.INTERVIEW,
  JobApplicationStatus.HIRED,
  JobApplicationStatus.REJECTED,
];
