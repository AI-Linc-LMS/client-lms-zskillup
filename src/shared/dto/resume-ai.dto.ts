/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo. Change both together.
 *
 * Resume Builder AI helpers (section tailoring + ATS analysis). Powered by the
 * backend's OpenAI key; endpoints degrade to 503 when unconfigured. `resumeData`
 * is the opaque editor state (shape lives in the frontend resume module).
 */
import { IsIn, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export type ResumeAiSection = 'summary' | 'skills' | 'experience' | 'projects';

export class TailorSectionDto {
  @IsIn(['summary', 'skills', 'experience', 'projects'])
  section!: ResumeAiSection;

  @IsObject()
  resumeData!: Record<string, unknown>;

  @IsString()
  @MinLength(15)
  @MaxLength(12000)
  jobDescription!: string;
}

export class AtsAnalyzeDto {
  @IsObject()
  resumeData!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(12000)
  jobDescription?: string;
}

export interface SkillSuggestion {
  name: string;
  reason: string;
}
export interface BulletChange {
  position: string;
  company: string;
  index: number;
  before: string;
  after: string;
}
export interface ProjectChange {
  name: string;
  beforeDescription: string;
  afterDescription: string;
}

export interface TailorSectionResult {
  section: ResumeAiSection;
  rationale: string;
  summaryBefore?: string;
  summaryAfter?: string;
  reorderedSkillNames?: string[];
  missingSkillSuggestions?: SkillSuggestion[];
  bulletChanges?: BulletChange[];
  projectChanges?: ProjectChange[];
}

export interface AtsAnalyzeResult {
  overallScore: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  missingKeywords: string[];
}
