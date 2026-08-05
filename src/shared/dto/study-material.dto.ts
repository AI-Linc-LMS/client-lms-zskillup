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
  /** VIDEO watch state (absent for non-video / never-watched). Drives resume, the
   *  live progress bar, and the first-attempt seek lock. */
  positionSeconds?: number;
  /** Furthest second ever reached — the seek ceiling until the video is completed once. */
  maxWatchedSeconds?: number;
  /** Player-reported duration in seconds (0/absent until known). */
  durationSeconds?: number;
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
   * a locked topic, so hiding the UI is not the gate — hitting the API directly fails too.
   */
  locked: boolean;
  /** Student-facing reason, e.g. "Complete 'Arrays' to unlock this module." null when open. */
  lockedReason: string | null;
  /**
   * Phase 8 PAYWALL lock — DISTINCT from `locked` (the sequential-completion lock).
   * True → this module is paid and the caller isn't entitled: the server has STRIPPED
   * its non-free items' embed/quiz URLs (so the asset can't be harvested via the API)
   * and the client should render a buy affordance. Absent/false = open — fail-open on
   * old clients, paywall off, owner (platform/section/company/topic), or a module the
   * student already has progress in (grandfathered). Free items stay playable regardless.
   */
  paywallLocked?: boolean;
  /** The scope ref the caller would buy to unlock this module (for the CTA); null = the section/company itself. */
  paywallScopeRef?: string | null;
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
  /**
   * Phase 8: the caller does NOT own this whole section/company and isn't a platform
   * owner — the FE shows a "unlock this section/company" banner. Individual modules may
   * still be open (a la carte topic purchase, free items, or grandfathered progress),
   * so read `topics[].paywallLocked` for per-module state. Absent/false = full access
   * (fail-open: paywall off, owner, or old client).
   */
  accessLocked?: boolean;
}

export interface StudyMaterialProgressResultDto {
  itemId: string;
  done: boolean;
  topicProgressPct: number;
  sectionProgressPct: number;
  overallProgressPct: number;
}

/** Result of a watch-progress ping. `completed` flips true the moment the watch
 *  threshold is first crossed → the client refetches the tree to reflect the new
 *  completion (and, task 2, the now-unlocked seek/speed controls). */
export interface WatchSaveResultDto {
  completed: boolean;
  /** Furthest second reached, echoed back so the client's seek ceiling stays in sync. */
  maxWatchedSeconds: number;
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
  /** Company Overview section — its videos render on the hub Overview tab (unlocked,
   *  inline) and it is hidden from the Study-Material tab. Company scope only. */
  isOverview: boolean;
  topics: AdminStudyMaterialTopicDto[];
}
export interface AdminStudyMaterialDto {
  /** Company scope only — '' for a section-scoped tree. */
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
