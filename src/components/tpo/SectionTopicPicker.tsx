'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { listTopicsWithCounts, type ApiTopic } from '@/lib/api/catalog';
import { HIDDEN_ROOT_SLUGS } from '@/components/practice/section-meta';

/** Section → topics tree, matching the shop: hide junk roots, drop 0-question
 *  leaves, and dedupe same-named topics keeping the richest copy. */
function buildSectionTree(topics: ApiTopic[]) {
  const byId = new Map(topics.map((t) => [t.id, t]));
  const childOf = new Set(topics.filter((t) => t.parentId).map((t) => t.parentId));
  const rootOf = (t: ApiTopic): ApiTopic => {
    let cur = t;
    while (cur.parentId && byId.has(cur.parentId)) cur = byId.get(cur.parentId)!;
    return cur;
  };
  const roots = topics
    .filter((t) => t.parentId === null && !HIDDEN_ROOT_SLUGS.has(t.slug))
    .sort((a, b) => a.name.localeCompare(b.name));
  const leavesByRoot = new Map<string, ApiTopic[]>();
  for (const t of topics) {
    if (t.parentId === null || childOf.has(t.id)) continue;
    if (!t.questionCount) continue;
    const r = rootOf(t);
    if (HIDDEN_ROOT_SLUGS.has(r.slug)) continue;
    const list = leavesByRoot.get(r.id) ?? [];
    list.push(t);
    leavesByRoot.set(r.id, list);
  }
  const dedupe = (list: ApiTopic[]) => {
    const best = new Map<string, ApiTopic>();
    for (const t of list) {
      const key = t.name.trim().toLowerCase();
      const cur = best.get(key);
      if (!cur || (t.questionCount ?? 0) > (cur.questionCount ?? 0)) best.set(key, t);
    }
    return [...best.values()].sort((a, b) => a.name.localeCompare(b.name));
  };
  return roots
    .map((r) => ({ section: r, topics: dedupe(leavesByRoot.get(r.id) ?? []) }))
    .filter((s) => s.topics.length > 0);
}

/**
 * Multi-select of sections + topics for a SECTIONAL assessment. Checking a
 * section covers its whole subtree (the backend expands it); or drill in and
 * pick individual topics. Empty selection = sample across every section.
 */
export function SectionTopicPicker({
  selected,
  onChange,
}: {
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [topics, setTopics] = useState<ApiTopic[]>([]);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listTopicsWithCounts()
      .then(setTopics)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sections = useMemo(() => buildSectionTree(topics), [topics]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };
  const toggleOpen = (id: string) =>
    setOpen((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="col-span-full rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">
          Sections &amp; topics{' '}
          <span className="font-normal text-slate-400">
            · {selected.size ? `${selected.size} selected` : 'all sections (leave empty to mix)'}
          </span>
        </span>
        {selected.size > 0 && (
          <button type="button" onClick={() => onChange(new Set())} className="text-xs font-semibold text-[#1a1d29] hover:underline">
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="size-5 animate-spin text-slate-400" />
        </div>
      ) : sections.length === 0 ? (
        <p className="py-4 text-center text-xs text-slate-400">No sections available.</p>
      ) : (
        <div className="mt-2 max-h-64 space-y-1 overflow-y-auto pr-1">
          {sections.map(({ section, topics: subs }) => {
            const secChecked = selected.has(section.id);
            const isOpen = open.has(section.id);
            return (
              <div key={section.id} className="overflow-hidden rounded-lg border border-slate-100 bg-white">
                <div className="flex items-center gap-2 px-2.5 py-1.5">
                  <input
                    type="checkbox"
                    checked={secChecked}
                    onChange={() => toggle(section.id)}
                    className="size-3.5 accent-[#ffc42d]"
                    aria-label={`Select all of ${section.name}`}
                  />
                  <button
                    type="button"
                    onClick={() => toggleOpen(section.id)}
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="truncate text-sm font-semibold text-navy">{section.name}</span>
                    <span className="text-[11px] text-slate-400">{subs.length}</span>
                    <ChevronDown className={`ml-auto size-3.5 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                {isOpen && (
                  <div className="space-y-1 border-t border-slate-100 px-2.5 py-1.5">
                    {subs.map((t) => (
                      <label key={t.id} className="flex items-center gap-2 pl-5 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={secChecked || selected.has(t.id)}
                          disabled={secChecked}
                          onChange={() => toggle(t.id)}
                          className="size-3.5 accent-[#ffc42d] disabled:opacity-50"
                        />
                        <span className="truncate">{t.name}</span>
                        <span className="ml-auto text-[11px] text-slate-300">{t.questionCount}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
