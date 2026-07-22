/**
 * SHARED CONTRACT - DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo. Change both together.
 *
 * Per-company Study Material - an admin-authored Section → Topic → Item tree shown
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
  /**
   * A module (topic) stays locked until the PREVIOUS module in its section is finished,
   * so students can't skip ahead. The first module of every section is always open, and
   * within an open module the items can be done in any order.
   *
   * Server-computed and server-ENFORCED: toggleItem() refuses to complete an item inside
   * a locked topic, so hiding the UI is not the gate - hitting the API directly fails too.
   */
  locked: boolean;
  /** Student-facing reason, e.g. "Complete 'Arrays' to unlock this module." null when open. */
  lockedReason: string | null;
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

// ── Admin (authoring) - includes unpublished + raw editable fields ──────────
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
  /** Company scope only - '' for a section-scoped tree. */
  companyId: string;
  /** The scope ref used for display/deep-links: company slug OR section root slug. */
  companySlug: string;
  /** Human label: company name OR section name. */
  companyName: string;
  /** Which hub this tree belongs to (defaults to 'company' when absent). */
  scopeType?: 'company' | 'section';
  /** Section-scope root slug (null for company scope). */
  sectionSlug?: string | null;
  sections: AdminStudyMaterialSectionDto[];
}
