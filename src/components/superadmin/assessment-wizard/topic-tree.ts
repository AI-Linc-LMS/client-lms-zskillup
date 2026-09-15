import type { ApiTopic } from '@/lib/api/catalog';
import { HIDDEN_ROOT_SLUGS } from '@/components/practice/section-meta';

/**
 * Section → Topic → Subtopic as ONE flat, depth-annotated option list, so every picker in
 * the wizard offers the same tree at every depth (picking a node samples its whole subtree
 * server-side). Hidden roots and branches with no published questions anywhere below are
 * left out.
 */
export interface TopicOption {
  id: string;
  name: string;
  /** "Section › Topic › Subtopic". */
  path: string;
  depth: number;
}

export function buildTopicOptions(
  topics: ApiTopic[],
  /** `keepEmpty`: keep every branch, e.g. for a bank console that also lists drafts (the
   *  counts cover PUBLISHED questions only, and plain listTopics() carries none). */
  { keepEmpty = false }: { keepEmpty?: boolean } = {},
): TopicOption[] {
  const children = new Map<string | null, ApiTopic[]>();
  for (const t of topics) {
    const list = children.get(t.parentId) ?? [];
    list.push(t);
    children.set(t.parentId, list);
  }
  const byName = (a: ApiTopic, b: ApiTopic) => a.name.localeCompare(b.name);

  // A node stays when it, or anything below it, has published questions. (The with-counts
  // endpoint only rolls counts up one level, so a root can read 0 while a grandchild has
  // questions — hence the walk instead of trusting the root's number.)
  const keep = new Map<string, boolean>();
  const hasQuestions = (t: ApiTopic, guard: Set<string>): boolean => {
    if (keep.has(t.id)) return keep.get(t.id)!;
    if (guard.has(t.id)) return false;
    guard.add(t.id);
    const below = (children.get(t.id) ?? []).map((c) => hasQuestions(c, guard)).some(Boolean);
    const result = (t.questionCount ?? 0) > 0 || below;
    keep.set(t.id, result);
    return result;
  };

  const out: TopicOption[] = [];
  const walk = (t: ApiTopic, depth: number, trail: string[], guard: Set<string>) => {
    if (guard.has(t.id) || (!keepEmpty && !hasQuestions(t, new Set()))) return;
    guard.add(t.id);
    const path = [...trail, t.name];
    out.push({ id: t.id, name: t.name, path: path.join(' › '), depth });
    for (const c of [...(children.get(t.id) ?? [])].sort(byName)) walk(c, depth + 1, path, guard);
  };
  const roots = (children.get(null) ?? []).filter((r) => !HIDDEN_ROOT_SLUGS.has(r.slug)).sort(byName);
  const guard = new Set<string>();
  for (const r of roots) walk(r, 0, [], guard);
  return out;
}

/** Option text with visual indentation for a native <select>. */
export function indentedLabel(o: TopicOption): string {
  const pad = '   '.repeat(o.depth);
  return o.depth === 0 ? `${o.name} (whole section)` : `${pad}${o.name}`;
}
