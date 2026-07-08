'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ArrowRight, ChevronDown, Layers, Loader2, Search, Sparkles, Wand2 } from 'lucide-react';
import { listTopicsWithCounts, type ApiTopic } from '@/lib/api/catalog';
import { listCodingTopics, type CodingTopic } from '@/lib/api/mocks';
import { HIDDEN_ROOT_SLUGS } from '@/components/practice/section-meta';
import { CodingBlock } from '@/components/practice/CodingBlock';

/** Section → topics tree: hide junk roots, drop 0-question leaves, and dedupe
 *  same-named topics keeping the richest copy (mirrors the shop). */
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
    return [...best.values()].sort((a, b) => (b.questionCount ?? 0) - (a.questionCount ?? 0));
  };
  return roots
    .map((r) => ({ section: r, topics: dedupe(leavesByRoot.get(r.id) ?? []) }))
    .filter((s) => s.topics.length > 0);
}

/**
 * Practice as-wish (Mode 2) — type any topic/subtopic and start an unbounded
 * adaptive session, or browse every section of the bank. Bank questions are
 * served first; when the pool runs dry the backend generates fresh AI questions,
 * so free text with no taxonomy match is welcome too.
 */
export default function PracticeWishPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<ApiTopic[] | null>(null);
  const [codingTopics, setCodingTopics] = useState<CodingTopic[]>([]);
  const [query, setQuery] = useState('');
  const [launching, setLaunching] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    listTopicsWithCounts()
      .then(setTopics)
      .catch(() => setTopics([]));
    listCodingTopics()
      .then(setCodingTopics)
      .catch(() => setCodingTopics([]));
  }, []);

  const q = query.trim().toLowerCase();
  const sections = useMemo(() => (topics ? buildSectionTree(topics) : []), [topics]);
  const totalTopics = useMemo(() => sections.reduce((n, s) => n + s.topics.length, 0), [sections]);
  const filteredCodingTopics = useMemo(
    () => (q ? codingTopics.filter((t) => t.topic.toLowerCase().includes(q)) : codingTopics),
    [codingTopics, q],
  );
  const codingVisible = !q || 'coding'.includes(q) || filteredCodingTopics.length > 0;

  const visible = useMemo(() => {
    if (!q) return sections;
    return sections
      .map((s) => ({
        ...s,
        topics: s.topics.filter((t) => t.name.toLowerCase().includes(q) || s.section.name.toLowerCase().includes(q)),
      }))
      .filter((s) => s.topics.length > 0);
  }, [sections, q]);

  const exactMatch = useMemo(
    () => sections.some((s) => s.topics.some((t) => t.name.toLowerCase() === q)),
    [sections, q],
  );

  const launch = (topicText: string) => {
    const text = topicText.trim();
    if (!text || launching) return;
    setLaunching(text);
    router.push(`/dashboard/quiz/adaptive?aswish=${encodeURIComponent(text)}`);
  };
  const toggle = (id: string) =>
    setCollapsed((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Practice as Wish' },
        ]}
      />

      {/* hero */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#3b1f6d] via-[#2a1a52] to-[#140b28] p-6 text-white shadow-sm sm:p-8">
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[#a855f7]/30 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute -bottom-20 left-1/4 size-56 rounded-full bg-[#f0abfc]/20 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-white/70 ring-1 ring-inset ring-white/15">
            <Sparkles className="size-3.5" /> Practice as-wish
          </span>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Practice anything, any amount</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/60">
            Type any topic, or browse every section below. We pull from the bank and, when it runs out,
            craft brand-new questions with AI — adaptive, unbounded, and yours to end whenever you like.
          </p>

          {/* search box */}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && launch(query)}
                placeholder="Search a topic, or type anything — e.g. Time & Work, Binary Search…"
                className="w-full rounded-xl border border-white/15 bg-white/10 px-10 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
              />
            </div>
            <button
              onClick={() => launch(query)}
              disabled={!query.trim() || !!launching}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-[#2a1a52] transition-transform enabled:hover:-translate-y-0.5 disabled:opacity-40"
            >
              {launching === query.trim() ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
              Start practicing
            </button>
          </div>
          {query.trim() && !exactMatch ? (
            <p className="mt-2 flex items-center gap-1.5 text-[12px] text-white/60">
              <Sparkles className="size-3.5 text-fuchsia-300" />
              No exact match — we&apos;ll craft fresh questions for &ldquo;{query.trim()}&rdquo;.
            </p>
          ) : null}
        </div>
      </section>

      {/* Coding — practise any coding topic on the go (Judge0-evaluated) */}
      {codingVisible && codingTopics.length > 0 ? <CodingBlock topics={filteredCodingTopics} /> : null}

      {/* browse all topics, grouped by section */}
      <div>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-violet-600 ring-1 ring-inset ring-violet-100">
              <Layers className="size-3.5" /> {q ? 'Matching topics' : 'Browse the bank'}
            </span>
            <h2 className="mt-2 text-lg font-extrabold tracking-tight text-navy sm:text-xl">
              Pick any topic to start instantly
            </h2>
          </div>
          {topics !== null && (
            <span className="text-sm font-semibold text-slate-400">
              {totalTopics} topics · {sections.length} sections
            </span>
          )}
        </div>

        {topics === null ? (
          <div className="flex items-center gap-2 py-10 text-sm text-slate-400">
            <Loader2 className="size-4 animate-spin" /> Loading topics…
          </div>
        ) : visible.length > 0 ? (
          <div className="space-y-4">
            {visible.map(({ section, topics: subs }) => {
              const open = !collapsed.has(section.id) || !!q;
              return (
                <section key={section.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => toggle(section.id)}
                    className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50/60"
                    aria-expanded={open}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-600">
                      <Layers className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-black text-navy">{section.name}</span>
                      <span className="text-xs text-slate-400">
                        {subs.length} topic{subs.length === 1 ? '' : 's'}
                      </span>
                    </span>
                    <ChevronDown className={`size-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && (
                    <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/40 p-4">
                      {subs.map((t) => {
                        const busy = launching === t.name.trim();
                        return (
                          <button
                            key={t.id}
                            onClick={() => launch(t.name)}
                            disabled={!!launching}
                            className="group inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-navy shadow-sm transition-colors hover:border-violet-300 hover:bg-violet-50/70 disabled:opacity-60"
                          >
                            {busy ? <Loader2 className="size-3 animate-spin text-violet-500" /> : null}
                            {t.name}
                            <ArrowRight className="size-3 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-violet-500" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 p-6 text-center">
            <Sparkles className="mx-auto size-6 text-violet-400" />
            <p className="mt-2 text-sm text-slate-600">
              No topic matches &ldquo;{query.trim()}&rdquo; in the bank yet.
            </p>
            <button
              onClick={() => launch(query)}
              disabled={!query.trim() || !!launching}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              <Wand2 className="size-4" /> Generate a fresh set
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
