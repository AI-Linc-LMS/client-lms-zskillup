import type { ApiTopic } from '@/lib/api/catalog';

/**
 * Section-catalog derivation — the Sectional Hubs analog of the company catalog.
 *
 * There is NO "section" table: a section IS a root topic (`parentId === null`) in
 * the bank, and the taxonomy is Section (root) → Topic → Subtopic (leaf, where the
 * questions live). This module turns the flat `/topics/with-counts` list into the
 * nested tree the hubs render, keyed by the same root slugs `section-meta.ts` styles.
 *
 * Kept data-only (no lucide/React imports) so it is safe to call from server
 * components — the presentation layer maps slug → icon/accent via `sectionMetaFor`.
 */

/** Roots we never surface as a section (AI-experiment buckets, not part of the model). */
export const HIDDEN_SECTION_ROOTS = new Set(['ai-practice-topics']);

/** Canonical display order for the known MCQ sections; unknown roots sort after. */
const SECTION_ORDER: Record<string, number> = {
  'section-1-numerical-ability': 1,
  'section-2-logical-reasoning': 2,
  'section-3-verbal-ability': 3,
  'section-4-technical-mcqs': 4,
};

export interface SectionSubtopic {
  slug: string;
  name: string;
  questionCount: number;
}

export interface SectionTopic {
  slug: string;
  name: string;
  questionCount: number;
  subtopics: SectionSubtopic[];
}

export interface SectionRoot {
  slug: string;
  name: string;
  order: number;
  /** Rolled-up published-question count for the whole section. */
  questionCount: number;
  /** Number of mid-level topics under the section. */
  topicCount: number;
  topics: SectionTopic[];
}

function orderFor(slug: string, index: number): number {
  return SECTION_ORDER[slug] ?? 90 + index;
}

/**
 * Build the section → topic → subtopic tree from the flat topic list. Only roots
 * with a published-question count are surfaced (mirrors the practice picker), so
 * empty/experimental roots never render as a buyable section.
 */
export function buildSections(topics: ApiTopic[]): SectionRoot[] {
  const byParent = new Map<string, ApiTopic[]>();
  for (const t of topics) {
    const key = t.parentId ?? '__root__';
    const bucket = byParent.get(key);
    if (bucket) bucket.push(t);
    else byParent.set(key, [t]);
  }

  const childrenOf = (id: string): ApiTopic[] => byParent.get(id) ?? [];

  const roots = (byParent.get('__root__') ?? [])
    .filter((r) => !HIDDEN_SECTION_ROOTS.has(r.slug) && (r.questionCount ?? 0) > 0)
    .map((r, index): SectionRoot => {
      const topicNodes = childrenOf(r.id).map((topic): SectionTopic => {
        const subtopicNodes = childrenOf(topic.id).map(
          (sub): SectionSubtopic => ({
            slug: sub.slug,
            name: sub.name,
            questionCount: sub.questionCount ?? 0,
          }),
        );
        return {
          slug: topic.slug,
          name: topic.name,
          questionCount: topic.questionCount ?? 0,
          subtopics: subtopicNodes,
        };
      });
      return {
        slug: r.slug,
        name: r.name,
        order: orderFor(r.slug, index),
        questionCount: r.questionCount ?? 0,
        topicCount: topicNodes.length,
        topics: topicNodes,
      };
    })
    // A real section is a curated root WITH child topics — not a flat AI-experiment
    // bucket (arrays-ai, lr-ai, strings-ai …) that happens to hold a handful of
    // questions but no topic tree. Mirrors the practice picker's children filter, so
    // the two never disagree on what counts as a section.
    .filter((s) => s.topicCount > 0);

  return roots.sort((a, b) => a.order - b.order);
}

/** Resolve one section's full tree by its root slug (null when unknown/empty). */
export function findSection(topics: ApiTopic[], slug: string): SectionRoot | null {
  return buildSections(topics).find((s) => s.slug === slug) ?? null;
}

/**
 * Flatten every practiceable leaf (a subtopic, or a mid-level topic that has no
 * subtopics of its own) with the topic-slug the adaptive runner + TOPIC
 * entitlements key on. This is the unit of per-topic (₹9) locking + practice.
 */
export interface SectionLeaf {
  slug: string;
  name: string;
  questionCount: number;
  /** The mid-level topic this leaf belongs to (for grouping in the syllabus). */
  groupName: string;
}

export function sectionLeaves(section: SectionRoot): SectionLeaf[] {
  const leaves: SectionLeaf[] = [];
  for (const topic of section.topics) {
    if (topic.subtopics.length === 0) {
      leaves.push({ slug: topic.slug, name: topic.name, questionCount: topic.questionCount, groupName: topic.name });
    } else {
      for (const sub of topic.subtopics) {
        leaves.push({ slug: sub.slug, name: sub.name, questionCount: sub.questionCount, groupName: topic.name });
      }
    }
  }
  return leaves;
}
