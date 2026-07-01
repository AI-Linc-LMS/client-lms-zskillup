'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ArrowRight, Loader2, Search, Sparkles, Wand2 } from 'lucide-react';
import { listTopicsWithCounts, type ApiTopic } from '@/lib/api/catalog';

/**
 * Practice as-wish (Mode 2) — type any topic/subtopic and start an unbounded
 * adaptive session. Existing bank questions are served first; when the pool runs
 * dry the backend generates fresh AI questions. Free text is allowed even with no
 * taxonomy match — that's how a brand-new topic gets created + generated.
 */
export default function PracticeWishPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<ApiTopic[] | null>(null);
  const [query, setQuery] = useState('');
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    listTopicsWithCounts()
      .then((t) => setTopics(t.filter((x) => (x.questionCount ?? 0) > 0 || x.parentId !== null)))
      .catch(() => setTopics([]));
  }, []);

  const q = query.trim().toLowerCase();
  const suggestions = useMemo(() => {
    if (!topics) return [];
    const pool = topics.filter((t) => t.parentId !== null); // leaf/subtopics
    if (!q) return pool.slice(0, 18);
    return pool.filter((t) => t.name.toLowerCase().includes(q)).slice(0, 18);
  }, [topics, q]);

  const exactMatch = useMemo(
    () => (topics ?? []).some((t) => t.name.toLowerCase() === q),
    [topics, q],
  );

  const launch = (topicText: string) => {
    const text = topicText.trim();
    if (!text || launching) return;
    setLaunching(true);
    router.push(`/dashboard/quiz/adaptive?aswish=${encodeURIComponent(text)}`);
  };

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
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#3b1f6d] via-[#2a1a52] to-[#140b28] p-6 text-white shadow-sm sm:p-8">
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[#a855f7]/30 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute -bottom-20 left-1/4 size-56 rounded-full bg-[#f0abfc]/20 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-white/70 ring-1 ring-inset ring-white/15">
            <Sparkles className="size-3.5" /> Practice as-wish
          </span>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Practice anything, any amount</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/60">
            Type any topic. We&apos;ll pull from the bank and, when it runs out, craft brand-new questions
            with AI — adaptive, unbounded, and yours to end whenever you like.
          </p>

          {/* search box */}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && launch(query)}
                placeholder="e.g. Time & Work, Binary Search, Assertion-Reason…"
                className="w-full rounded-xl border border-white/15 bg-white/10 px-10 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
              />
            </div>
            <button
              onClick={() => launch(query)}
              disabled={!query.trim() || launching}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-[#2a1a52] transition-transform enabled:hover:-translate-y-0.5 disabled:opacity-40"
            >
              {launching ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
              Start practicing
            </button>
          </div>
          {query.trim() && !exactMatch ? (
            <p className="mt-2 flex items-center gap-1.5 text-[12px] text-white/60">
              <Sparkles className="size-3.5 text-fuchsia-300" />
              We&apos;ll craft fresh questions for &ldquo;{query.trim()}&rdquo;.
            </p>
          ) : null}
        </div>
      </section>

      {/* suggestions */}
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-violet-600 ring-1 ring-inset ring-violet-100">
          <Sparkles className="size-3.5" /> {q ? 'Matching topics' : 'Popular topics'}
        </span>
        <h2 className="mb-4 mt-2 text-lg font-extrabold tracking-tight text-navy sm:text-xl">
          Or pick one to start instantly
        </h2>
        {topics === null ? (
          <div className="flex items-center gap-2 py-6 text-sm text-slate-400">
            <Loader2 className="size-4 animate-spin" /> Loading topics…
          </div>
        ) : suggestions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((t) => (
              <button
                key={t.id}
                onClick={() => launch(t.name)}
                className="group inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-navy transition-colors hover:border-violet-300 hover:bg-violet-50/70"
              >
                {t.name}
                {t.questionCount ? (
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                    {t.questionCount}
                  </span>
                ) : null}
                <ArrowRight className="size-3 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-violet-500" />
              </button>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-slate-200/80 bg-white p-5 text-sm text-slate-500">
            No topic matches &ldquo;{query.trim()}&rdquo; in the bank yet — hit{' '}
            <span className="font-semibold text-navy">Start practicing</span> and we&apos;ll generate a
            fresh set for you.
          </p>
        )}
      </div>
    </div>
  );
}
