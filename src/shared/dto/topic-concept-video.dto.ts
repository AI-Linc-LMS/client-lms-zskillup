/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo. Change both together.
 *
 * Admin authoring of per-topic concept videos (Vimeo). An admin attaches a concept
 * video to a taxonomy topic; the adaptive Concept-Video modal + study-plan step then
 * play it. Provider is detected from the pasted URL; the embed URL is server-derived.
 */
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** One topic row in the concept-video admin list. */
export interface AdminTopicConceptVideoDto {
  id: string;
  slug: string;
  name: string;
  sectionName: string;
  /** Published MCQ count under this topic (helps prioritise which to author). */
  questionCount: number;
  /** Raw stored link (what the admin pasted). Null = no video. */
  conceptVideoUrl: string | null;
  conceptVideoTitle: string | null;
  /** Detected provider (VIMEO / YOUTUBE / …). */
  conceptVideoProvider: string | null;
  /** Ready-to-embed player URL (server-derived); null when no video. */
  conceptVideoEmbedUrl: string | null;
}

/** Admin upsert body — set (or clear, with url empty/null) a topic's concept video. */
export class SetTopicConceptVideoDto {
  @IsOptional() @IsString() @MaxLength(600) url?: string | null;
  @IsOptional() @IsString() @MaxLength(200) title?: string | null;
}
