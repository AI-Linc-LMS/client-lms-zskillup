import { BookOpen, Brain, Calculator, Code2, Cpu, Layers, Users } from 'lucide-react';

/**
 * Shared section presentation metadata, keyed by the REAL root-topic slugs in the
 * bank. The taxonomy is Section (root) → Topic (leaf); these are the five sections
 * students segregate practice/mocks by. Both the adaptive practice picker and the
 * custom-mock builder read this so section order, icon and colour stay in sync.
 */

export type Accent = 'sky' | 'violet' | 'orange' | 'emerald' | 'indigo' | 'amber';

export const ACCENT_CYCLE: Accent[] = ['sky', 'violet', 'orange', 'emerald', 'indigo', 'amber'];

export const ACCENT_CLASS: Record<Accent, { tile: string; chip: string; solid: string }> = {
  sky: { tile: 'bg-sky-50 text-sky-600 ring-sky-100', chip: 'hover:border-sky-300 hover:bg-sky-50/70', solid: 'bg-sky-500' },
  violet: { tile: 'bg-violet-50 text-violet-600 ring-violet-100', chip: 'hover:border-violet-300 hover:bg-violet-50/70', solid: 'bg-violet-500' },
  orange: { tile: 'bg-orange-50 text-orange-600 ring-orange-100', chip: 'hover:border-orange-300 hover:bg-orange-50/70', solid: 'bg-orange-500' },
  emerald: { tile: 'bg-emerald-50 text-emerald-600 ring-emerald-100', chip: 'hover:border-emerald-300 hover:bg-emerald-50/70', solid: 'bg-emerald-500' },
  indigo: { tile: 'bg-indigo-50 text-indigo-600 ring-indigo-100', chip: 'hover:border-indigo-300 hover:bg-indigo-50/70', solid: 'bg-indigo-500' },
  amber: { tile: 'bg-amber-50 text-amber-600 ring-amber-100', chip: 'hover:border-amber-300 hover:bg-amber-50/70', solid: 'bg-amber-500' },
};

export interface SectionMeta {
  icon: typeof Calculator;
  accent: Accent;
  order: number;
}

/** The four MCQ sections + the Coding and Soft-Skills sections (Sectional Hubs). */
export const SECTION_META: Record<string, SectionMeta> = {
  'section-1-numerical-ability': { icon: Calculator, accent: 'sky', order: 1 },
  'section-2-logical-reasoning': { icon: Brain, accent: 'orange', order: 2 },
  'section-3-verbal-ability': { icon: BookOpen, accent: 'violet', order: 3 },
  'section-4-technical-mcqs': { icon: Cpu, accent: 'emerald', order: 4 },
  coding: { icon: Code2, accent: 'indigo', order: 5 },
  'section-5-interview-preparation': { icon: Users, accent: 'amber', order: 6 },
};

/** Coding is section 5 - a separate Judge0 system, so it renders synthetically. */
export const CODING_META: SectionMeta = { icon: Code2, accent: 'indigo', order: 5 };

/**
 * Leftover AI-experiment roots we never surface in the pickers (they're not part
 * of the five-section model). Their questions stay in the bank; they're just not
 * offered as a section. `*-ai` flat roots have no children so they're already
 * excluded by the children filter - `ai-practice-topics` is the only one with a
 * child, so it needs an explicit hide.
 */
export const HIDDEN_ROOT_SLUGS = new Set(['ai-practice-topics']);

/** Section metadata for a root, falling back to neutral styling for unknown roots. */
export function sectionMetaFor(slug: string, index: number): SectionMeta {
  return SECTION_META[slug] ?? { icon: Layers, accent: ACCENT_CYCLE[index % ACCENT_CYCLE.length], order: 90 + index };
}

/** Editorial card copy for a section - category eyebrow, difficulty descriptor and
 *  a punchier tagline than the generic default, used by the Sectional Hubs cards. */
export type SectionDifficulty = 'Easy' | 'Medium' | 'Hard';
export interface SectionDescriptor {
  category: string;
  difficulty: SectionDifficulty;
  tagline: string;
}
export const SECTION_DESCRIPTORS: Record<string, SectionDescriptor> = {
  'section-1-numerical-ability': {
    category: 'Quantitative',
    difficulty: 'Medium',
    tagline: 'Master numbers, arithmetic, algebra and advanced calculations.',
  },
  'section-2-logical-reasoning': {
    category: 'Reasoning',
    difficulty: 'Medium',
    tagline: 'Sharpen your reasoning with puzzles, patterns and logic sets.',
  },
  'section-3-verbal-ability': {
    category: 'Verbal',
    difficulty: 'Easy',
    tagline: 'Improve grammar, vocabulary and reading comprehension.',
  },
  'section-4-technical-mcqs': {
    category: 'Technical',
    difficulty: 'Hard',
    tagline: 'Core CS fundamentals, programming and technical concepts.',
  },
  coding: {
    category: 'Programming',
    difficulty: 'Hard',
    tagline: 'Solve Judge0-evaluated DSA problems across data structures and algorithms.',
  },
  'section-5-interview-preparation': {
    category: 'Soft Skills',
    difficulty: 'Easy',
    tagline: 'HR, behavioural and technical interview prep - communication and confidence.',
  },
};
export function sectionDescriptorFor(slug: string): SectionDescriptor {
  return (
    SECTION_DESCRIPTORS[slug] ?? {
      category: 'Section',
      difficulty: 'Medium',
      tagline: 'Master this section end to end - guided syllabus, study material and topic-wise practice.',
    }
  );
}

/** Difficulty pill tone (matches the company card scale). */
export const DIFFICULTY_TONE: Record<SectionDifficulty, string> = {
  Easy: 'bg-emerald-50 text-emerald-700 ring-emerald-200/70',
  Medium: 'bg-amber-50 text-amber-700 ring-amber-200/70',
  Hard: 'bg-red-50 text-red-700 ring-red-200/70',
};
