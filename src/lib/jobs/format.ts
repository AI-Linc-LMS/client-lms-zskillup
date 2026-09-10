import { CompensationKind, JobKind, EmploymentType, WorkMode } from '@/shared/enums';
import type { JobPostingDto } from '@/shared/dto/jobs.dto';

/** Human labels for the enums. One map, so a filter chip and a job card can never
 *  disagree about what "FULL_TIME" is called. */
export const WORK_MODE_LABEL: Record<WorkMode, string> = {
  [WorkMode.ONSITE]: 'On-site',
  [WorkMode.HYBRID]: 'Hybrid',
  [WorkMode.REMOTE]: 'Remote',
};

export const EMPLOYMENT_LABEL: Record<EmploymentType, string> = {
  [EmploymentType.FULL_TIME]: 'Full-time',
  [EmploymentType.PART_TIME]: 'Part-time',
  [EmploymentType.INTERNSHIP]: 'Internship',
  [EmploymentType.CONTRACT]: 'Contract',
  [EmploymentType.TEMPORARY]: 'Temporary',
};

export const JOB_KIND_LABEL: Record<JobKind, string> = {
  [JobKind.JOB]: 'Job',
  [JobKind.INTERNSHIP]: 'Internship',
};

/** Indian money, the way Indians read it. 1200000 -> "12 LPA", 20000 -> "Rs 20,000". */
function lakhs(rupees: number): string {
  const l = rupees / 100_000;
  return Number.isInteger(l) ? `${l}` : l.toFixed(1).replace(/\.0$/, '');
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

/**
 * What the role pays, in one line.
 *
 * Falls back to the legacy free-text `salary` field for postings written before
 * compensation was structured - those rows are real and dropping them would make old
 * jobs look like they pay nothing.
 */
export function compensationLabel(job: JobPostingDto): string | null {
  switch (job.compensationKind) {
    case CompensationKind.SALARY: {
      if (job.salaryMin && job.salaryMax) {
        return job.salaryMin === job.salaryMax
          ? `${lakhs(job.salaryMin)} LPA`
          : `${lakhs(job.salaryMin)}-${lakhs(job.salaryMax)} LPA`;
      }
      if (job.salaryMin) return `From ${lakhs(job.salaryMin)} LPA`;
      if (job.salaryMax) return `Up to ${lakhs(job.salaryMax)} LPA`;
      break;
    }
    case CompensationKind.STIPEND:
      if (job.stipendAmount) return `${inr(job.stipendAmount)}/month`;
      break;
    case CompensationKind.UNPAID:
      return 'Unpaid';
    default:
      break;
  }
  return job.salary?.trim() || null;
}

/**
 * How long is left, said the way a person would.
 *
 * Returns a tone as well as text: "Closes today" needs to look different from
 * "Apply by 30 Sep", and deciding that at each call site is how two screens end up
 * disagreeing about what counts as urgent.
 */
export function deadlineLabel(
  iso: string | null,
): { text: string; tone: 'urgent' | 'soon' | 'normal' | 'closed' } | null {
  if (!iso) return null;
  // Pin to IST: without an explicit timeZone this formats in the runtime's zone, so the
  // client card rendered 11:00 am (browser IST) while the SSR detail page rendered the
  // same deadline as 5:30 am (Node UTC). The deadline is an IST business time everywhere.
  const IST = 'Asia/Kolkata';
  const deadline = new Date(iso);
  // Closed is an EXACT-INSTANT decision (matches the server's applyBlockedReason), not a
  // day count — a deadline earlier TODAY (11:00 am when it is now 2:00 pm) is closed, and
  // must read "Closed", not "Closes today". Day-granularity here was letting the apply CTA
  // stay live past the cut-off.
  if (deadline.getTime() <= Date.now()) return { text: 'Closed', tone: 'closed' };

  // The deadline is an exact instant, so when it is near, the time matters as much as
  // the day - a student needs to know it closes at 5pm, not just "today".
  const at = deadline.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: IST });
  // today / tomorrow are IST CALENDAR days (not a rolling 24h window), so a deadline
  // this evening reads "today" and one tomorrow morning reads "tomorrow".
  const istDay = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: IST }); // YYYY-MM-DD
  const dayDiff = Math.round((Date.parse(istDay(deadline)) - Date.parse(istDay(new Date()))) / 86_400_000);
  if (dayDiff === 0) return { text: `Closes today, ${at}`, tone: 'urgent' };
  if (dayDiff === 1) return { text: `Closes tomorrow, ${at}`, tone: 'urgent' };
  if (dayDiff <= 7) return { text: `${dayDiff} days left`, tone: 'soon' };
  return {
    text: `Apply by ${deadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: IST })}`,
    tone: 'normal',
  };
}

/** The one-line summary under a job title. */
export function jobMetaLine(job: JobPostingDto): string {
  return [
    job.location,
    job.workMode ? WORK_MODE_LABEL[job.workMode] : null,
    job.employmentType ? EMPLOYMENT_LABEL[job.employmentType] : null,
    job.experience,
  ]
    .filter(Boolean)
    .join(' · ');
}
