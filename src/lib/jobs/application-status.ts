import { JobApplicationStatus } from '@/shared/enums';
import { ApplicationStage, STAGE_LABELS } from '@/shared/application-pipeline';
import type { StatusTone } from '@/components/student/StatusPill';

/**
 * One place that turns an application status into words a student understands.
 *
 * Every status carries a `reason` as well as a label. A bare "Under review" makes a
 * student wonder what they are supposed to do next and whether the silence means
 * something bad; saying who is holding it, and what happens next, is the difference
 * between a status and an answer. The admin panel and the student's own list read
 * from this same map so the two can never describe the same row differently.
 *
 * IT MUST COVER EVERY STAGE §10 CAN WRITE, AND THAT IS ENFORCED BY THE TYPE.
 *
 * This map used to hold the six statuses the board shipped with. §10 widened the
 * pipeline to twenty-one and the admin stage dialog writes all of them, so the first
 * time anyone moved a candidate to "Shortlisted by employer" the lookup returned
 * undefined and `.tone` threw — taking out the whole applicants page, and the student's
 * own application list with it, since both read from here. The keys are now derived from
 * `ApplicationStage`, so adding a stage to the shared contract without adding it here is
 * a compile error rather than a page that crashes once real data reaches it.
 *
 * NOTE ON `reason`: these describe the STAGE, never why a particular person was moved.
 * §11 tells the candidate the stage only — the internal reason and any panel feedback
 * stay inside the platform.
 */
type StatusMeta = { label: string; tone: StatusTone; reason: string };

/** Every §10 stage. Exhaustive by type — a new stage will not compile until it is here. */
const STAGE_META: Record<ApplicationStage, StatusMeta> = {
  [ApplicationStage.APPLIED]: {
    label: 'Applied',
    tone: 'info',
    reason:
      'We have your application. Nobody has opened it yet — that is normal in the first few days.',
  },
  [ApplicationStage.UNDER_REVIEW]: {
    label: 'Under review',
    tone: 'info',
    reason:
      'Someone on the hiring side is reading your profile right now. Nothing is needed from you.',
  },
  [ApplicationStage.NEEDS_INFO]: {
    label: 'Needs information',
    tone: 'warning',
    reason:
      'Something is missing before a decision can be made. Check your email — the placement team has asked you for it.',
  },
  [ApplicationStage.SHORTLISTED]: {
    label: 'Shortlisted',
    tone: 'warning',
    reason:
      'You made the shortlist. Expect the next step by email — keep an eye on your inbox.',
  },
  [ApplicationStage.ON_HOLD]: {
    label: 'On hold',
    tone: 'neutral',
    reason:
      'Paused, not rejected. This usually means the employer has slowed the process down; your application stays live.',
  },
  [ApplicationStage.ASSESSMENT_INVITED]: {
    label: 'Assessment invited',
    tone: 'warning',
    reason:
      'You have been invited to an assessment. Check your email for the window and sit it before it closes.',
  },
  [ApplicationStage.ASSESSMENT_COMPLETED]: {
    label: 'Assessment completed',
    tone: 'info',
    reason: 'Your assessment is in and is being looked at. Nothing is needed from you.',
  },
  [ApplicationStage.SHARED_WITH_EMPLOYER]: {
    label: 'Shared with employer',
    tone: 'info',
    reason:
      'Your profile has been sent to the employer. The next decision is theirs rather than the placement team’s.',
  },
  [ApplicationStage.EMPLOYER_SHORTLISTED]: {
    label: 'Shortlisted by employer',
    tone: 'warning',
    reason: 'The employer picked you out of the profiles they were sent. Expect a round invite.',
  },
  [ApplicationStage.IN_ROUND]: {
    label: 'In a round',
    tone: 'warning',
    reason: 'You are in an interview round. Check your email for the schedule and the details.',
  },
  [ApplicationStage.SELECTED]: {
    label: 'Selected',
    tone: 'positive',
    reason: 'The employer has selected you. An offer should follow — we will let you know.',
  },
  [ApplicationStage.WAITLISTED]: {
    label: 'Waitlisted',
    tone: 'neutral',
    reason:
      'You are on the waitlist. Not a no — it means they are holding you behind the candidates they offered first.',
  },
  [ApplicationStage.REJECTED]: {
    label: 'Not selected',
    tone: 'negative',
    reason: 'They went with someone else this time. Your other applications are unaffected.',
  },
  [ApplicationStage.OFFER_ISSUED]: {
    label: 'Offer issued',
    tone: 'positive',
    reason: 'An offer has been made to you. Check your email for the letter and the deadline.',
  },
  [ApplicationStage.OFFER_ACCEPTED]: {
    label: 'Offer accepted',
    tone: 'positive',
    reason: 'You have accepted this offer. The next step is your joining date.',
  },
  [ApplicationStage.OFFER_DECLINED]: {
    label: 'Offer declined',
    tone: 'neutral',
    reason: 'You turned this offer down. It stays on your record and does not count against you.',
  },
  [ApplicationStage.OFFER_EXPIRED]: {
    label: 'Offer expired',
    tone: 'neutral',
    reason:
      'This offer lapsed without an answer. If that was not deliberate, talk to your placement team.',
  },
  [ApplicationStage.JOINED]: {
    label: 'Joined',
    tone: 'positive',
    reason: 'You have started the role. Congratulations.',
  },
  [ApplicationStage.DID_NOT_JOIN]: {
    label: 'Did not join',
    tone: 'negative',
    reason:
      'Recorded as not having started after accepting. If that is wrong, tell your placement team — it affects your placement status.',
  },
  [ApplicationStage.WITHDRAWN]: {
    label: 'Withdrawn',
    tone: 'neutral',
    reason: 'You withdrew from this drive. Your other applications are unaffected.',
  },
  [ApplicationStage.NO_SHOW]: {
    label: 'No show',
    tone: 'negative',
    reason:
      'Recorded as not having attended a scheduled round. If that is wrong, tell your placement team.',
  },
};

/**
 * The three legacy-only values. §10 deliberately did NOT rename the board's original
 * vocabulary — the migration widened the fence and left the rows alone, because the one
 * time a status was renamed in place it emptied the public board for six minutes. So
 * rows written before §10 still carry these, and still have to render.
 */
const LEGACY_ONLY: Record<'SUBMITTED' | 'INTERVIEW' | 'HIRED', StatusMeta> = {
  SUBMITTED: STAGE_META[ApplicationStage.APPLIED],
  INTERVIEW: STAGE_META[ApplicationStage.IN_ROUND],
  HIRED: STAGE_META[ApplicationStage.SELECTED],
};

export const APPLICATION_STATUS: Record<string, StatusMeta> = {
  ...STAGE_META,
  ...LEGACY_ONLY,
};

/**
 * Look a status up without ever throwing.
 *
 * Belt and braces alongside the exhaustive type above: the type protects us from a stage
 * added to the shared contract, but not from a value that only ever existed in the
 * database. A row nobody anticipated should render as an unstyled pill saying what it
 * says — never take the page down. Losing a colour is a cosmetic failure; losing the
 * applicants screen is an outage.
 */
export function statusMeta(status: string | null | undefined): StatusMeta {
  if (status && APPLICATION_STATUS[status]) return APPLICATION_STATUS[status];
  return {
    label: status ? status.replace(/_/g, ' ').toLowerCase() : 'Unknown',
    tone: 'neutral',
    reason: 'This application is in a state this screen does not recognise.',
  };
}

/**
 * Statuses in the order an application actually travels, for the admin's dropdown.
 *
 * The full §10 order, so the dropdown can offer every stage the API accepts. The
 * legacy-only three are deliberately absent: they are readable but not newly settable,
 * which is what keeps the vocabulary converging rather than splitting further.
 */
export const APPLICATION_STATUS_ORDER: string[] = Object.values(ApplicationStage);

/** The six the board shipped with, kept for anything still typed to the old enum. */
export const LEGACY_APPLICATION_STATUS_ORDER: JobApplicationStatus[] = [
  JobApplicationStatus.SUBMITTED,
  JobApplicationStatus.UNDER_REVIEW,
  JobApplicationStatus.SHORTLISTED,
  JobApplicationStatus.INTERVIEW,
  JobApplicationStatus.HIRED,
  JobApplicationStatus.REJECTED,
];

/** Labels straight from the shared contract, for admin surfaces that want §10 wording. */
export { STAGE_LABELS };
