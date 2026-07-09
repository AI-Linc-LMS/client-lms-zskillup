/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo. Change both together.
 *
 * Per-company Study Material — an admin-authored Section → Topic → Item tree shown
 * inside a Company Hub, with per-student progress. Items are a VIDEO (Vimeo /
 * Google Drive / YouTube), a QUIZ (reuses the platform quiz for a topic), or an
 * ARTICLE. Sections/topics are dynamic + different for each company.
 */

export type StudyMaterialItemKind = 'VIDEO' | 'QUIZ' | 'ARTICLE';
export type StudyMaterialVideoProvider = 'VIMEO' | 'GDRIVE' | 'YOUTUBE';

// ── Student-facing (published tree + progress) ──────────────────────────────
export interface StudyMaterialItemDto {
  id: string;
  kind: StudyMaterialItemKind;
  title: string;
  description: string | null;
  /** VIDEO → a normalized embeddable URL for the player; ARTICLE → the link; QUIZ → null. */
  embedUrl: string | null;
  provider: StudyMaterialVideoProvider | null;
  durationLabel: string | null;
  /** QUIZ → deep-link into the platform quiz for the topic; else null. */
  quizHref: string | null;
  quizQuestionCount: number | null;
  isFree: boolean;
  done: boolean;
}

export interface StudyMaterialTopicDto {
  id: string;
  title: string;
  items: StudyMaterialItemDto[];
  doneCount: number;
  itemCount: number;
  progressPct: number;
}

export interface StudyMaterialSectionDto {
  id: string;
  title: string;
  subtitle: string | null;
  topics: StudyMaterialTopicDto[];
  doneCount: number;
  itemCount: number;
  progressPct: number;
}

export interface StudyMaterialDto {
  companySlug: string;
  hasContent: boolean;
  sections: StudyMaterialSectionDto[];
  itemCount: number;
  doneCount: number;
  progressPct: number;
}

export interface StudyMaterialProgressResultDto {
  itemId: string;
  done: boolean;
  topicProgressPct: number;
  sectionProgressPct: number;
  overallProgressPct: number;
}

// ── Admin (authoring) — includes unpublished + raw editable fields ──────────
export interface AdminStudyMaterialItemDto {
  id: string;
  kind: StudyMaterialItemKind;
  title: string;
  description: string | null;
  provider: StudyMaterialVideoProvider | null;
  url: string | null;
  durationLabel: string | null;
  quizTopicSlug: string | null;
  quizQuestionCount: number | null;
  orderIndex: number;
  isFree: boolean;
}
export interface AdminStudyMaterialTopicDto {
  id: string;
  title: string;
  orderIndex: number;
  items: AdminStudyMaterialItemDto[];
}
export interface AdminStudyMaterialSectionDto {
  id: string;
  title: string;
  subtitle: string | null;
  orderIndex: number;
  isPublished: boolean;
  topics: AdminStudyMaterialTopicDto[];
}
export interface AdminStudyMaterialDto {
  companyId: string;
  companySlug: string;
  companyName: string;
  sections: AdminStudyMaterialSectionDto[];
}
