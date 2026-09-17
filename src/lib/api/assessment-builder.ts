import { apiClient } from './client';
import type {
  AssessmentItemType,
  BuilderSectionDto,
  CreateAssessmentDto,
  CreatedAssessmentResult,
  EditAssessmentDto,
  EditedAssessmentOutcome,
  GenerateOneDto,
  SampleDifficulty,
  SampleQuestionsDto,
  SampleQuestionsResult,
  SelectionIdLists,
  SourceTopicDto,
} from '@/shared/dto/assessment-builder.dto';

/**
 * Assessment builder (`/admin/assessment-builder/*`) — SUPER_ADMIN, ADMIN and COLLEGE_ADMIN.
 * Request/response shapes come from the shared contract (ADR-011,
 * src/shared/dto/assessment-builder.dto.ts); the aliases below keep the names the
 * wizard already used.
 */
export type { AssessmentItemType, SampleDifficulty, SampleQuestionsResult, SelectionIdLists };
export type BuilderSection = BuilderSectionDto;
export type CreateAssessmentPayload = CreateAssessmentDto;
export type EditAssessmentPayload = EditAssessmentDto;
/** POST /create response. `droppedDuplicates` is optional here so a response from a server
 *  predating it still type-checks (it is always empty under `strictDuplicates: true`). */
export type CreatedAssessment = Omit<CreatedAssessmentResult, 'droppedDuplicates'> &
  Partial<Pick<CreatedAssessmentResult, 'droppedDuplicates'>>;

/** A distinct coding category (tags[0]) with its live bank count. */
export interface CodingTopic {
  topic: string;
  count: number;
}

/** Distinct coding topics with counts for the builder's coding picker.
 *  Served by the ADMIN/COLLEGE_ADMIN-scoped builder endpoint (the student
 *  `/mocks/coding-topics` route 403s for admins/TPOs). */
export async function listBuilderCodingTopics(): Promise<CodingTopic[]> {
  const res = await apiClient.get<CodingTopic[]>('/api/v1/admin/assessment-builder/coding-topics');
  return res.data;
}

/**
 * RANDOM selection: sample `count` eligible bank items for the admin to review before they
 * join a section. Persists nothing. MCQ scopes by `topicId` (whole subtree); CODING takes
 * exactly one of `codingTopic` / `allCoding`. `excludeIds` = everything already selected,
 * so a draw never returns a duplicate. `available` is the eligible pool after exclusions.
 */
export async function sampleQuestions(body: SampleQuestionsDto): Promise<SampleQuestionsResult> {
  const res = await apiClient.post<SampleQuestionsResult>('/api/v1/admin/assessment-builder/sample', body);
  return res.data;
}

/** Result of resolving a topic: bank items + how many to AI-generate. */
export interface SourcedTopic {
  topicId: string;
  topicName: string;
  type: AssessmentItemType;
  fromBank: Array<{ id: string; label: string }>;
  toGenerate: number;
  aiAvailable: boolean;
}

export interface GeneratedItem {
  id: string;
  label: string;
  type: string;
}

/** Resolve a topic + count → bank items + shortfall to generate. Prefer `topicId`
 *  (from the section/topic picker) - it samples the whole subtree from the bank. */
export async function sourceTopic(
  topic: string,
  type: AssessmentItemType,
  count: number,
  opts?: Pick<SourceTopicDto, 'topicId' | 'difficulty' | 'allCoding' | 'codingDifficulty'>,
): Promise<SourcedTopic> {
  const body: SourceTopicDto = {
    topic,
    type,
    count,
    topicId: opts?.topicId,
    difficulty: opts?.difficulty,
    allCoding: opts?.allCoding,
    codingDifficulty: opts?.codingDifficulty,
  };
  const res = await apiClient.post<SourcedTopic>('/api/v1/admin/assessment-builder/source', body);
  return res.data;
}

/** Generate ONE AI item (call in a loop for live progress). `topicId` is required for MCQ
 *  only — a coding topic is a tag, so CODING generation is keyed by `topicName`. */
export async function generateOne(body: GenerateOneDto): Promise<GeneratedItem> {
  const res = await apiClient.post<GeneratedItem>(
    '/api/v1/admin/assessment-builder/generate-one',
    body,
  );
  return res.data;
}

/** Create + publish. Every id is validated server-side (400 INVALID_QUESTION_IDS). With
 *  `strictDuplicates: true` a repeated id is a 400 DUPLICATE_QUESTION_IDS; without it the
 *  server keeps the first occurrence and reports the rest in `droppedDuplicates`. Offending
 *  ids come back in `details` (see question-selection-errors). */
export async function createAssessment(payload: CreateAssessmentPayload): Promise<CreatedAssessment> {
  const res = await apiClient.post<CreatedAssessment>(
    '/api/v1/admin/assessment-builder/create',
    payload,
  );
  return res.data;
}

/** One question/coding problem already in an assessment. */
export interface EditableAssessmentItem {
  id: string;
  type: AssessmentItemType;
  label: string;
  difficulty: string;
  marks: number;
}

/** Editable snapshot of an assessment (locked once it has submissions). */
export interface EditableAssessment {
  id: string;
  companyId: string | null;
  mockTestId: string | null;
  title: string;
  scheduledAt: string;
  /** Hard close of the availability window (null = open-ended). THE gate on whether a
   *  student may still start — an admin can move it even after attempts have started. */
  endsAt: string | null;
  /** Registration / entry cutoff (null = none). Moves with `endsAt`. */
  registrationCloseAt: string | null;
  durationMinutes: number;
  proctored: boolean;
  proctorAutoSubmit?: boolean;
  proctorMaxWarnings?: number;
  passingScore: number;
  subscriptionLockEnabled: boolean;
  profileLockEnabled: boolean;
  attempts: number;
  mcqCount: number;
  codingCount: number;
  /** Sum of every linked item's marks. */
  totalMarks: number;
  /** Nothing about the drive may change (it has attempts). The closing window is the
   *  exception — see `deadlineEditable`. */
  editable: boolean;
  /**
   * The closing window (`endsAt` / `registrationCloseAt`) can be moved whatever `editable`
   * says. OPTIONAL only because this console can be live for the few minutes before its
   * paired backend is (deploy the backend first): absent ⇒ an older server that still
   * refuses every edit of an attempted drive, so keep it fully locked rather than offering
   * a Save that would 400.
   */
  deadlineEditable?: boolean;
  items: EditableAssessmentItem[];
}

export async function getEditableAssessment(id: string): Promise<EditableAssessment> {
  const res = await apiClient.get<EditableAssessment>(
    `/api/v1/admin/assessment-builder/${id}/editable`,
  );
  return res.data;
}

/** PATCH response: the editable snapshot plus what a non-strict append left out (optional
 *  here; always empty under `strictDuplicates: true`). */
export type EditedAssessment = EditableAssessment & Partial<EditedAssessmentOutcome>;

/** Edit details and APPEND sections. 409 QUESTION_SET_LOCKED once the drive has attempts;
 *  with `strictDuplicates: true`, 400 DUPLICATE_QUESTION_IDS also names ids the assessment
 *  already holds. */
export async function updateAssessment(id: string, payload: EditAssessmentPayload): Promise<EditedAssessment> {
  const res = await apiClient.patch<EditedAssessment>(
    `/api/v1/admin/assessment-builder/${id}`,
    payload,
  );
  return res.data;
}

/**
 * Move ONLY a drive's closing date/time — the one edit an assessment students have
 * already sat still accepts (anything else comes back 400
 * ASSESSMENT_LOCKED_EXCEPT_DEADLINE). Sends nothing but `endsAt`, so a value the admin
 * never touched can't accidentally count as a change.
 *
 * Deliberately this route and not PATCH /admin/scheduled-assessments/:id: the builder
 * endpoint is the one a COLLEGE_ADMIN may call, so the super-admin scheduler and the TPO
 * Assessment Center extend a deadline through exactly the same path and scoping.
 */
export async function extendAssessmentDeadline(id: string, endsAtIso: string): Promise<EditedAssessment> {
  return updateAssessment(id, { endsAt: endsAtIso });
}
