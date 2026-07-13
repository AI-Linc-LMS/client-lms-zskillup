'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Code2, Loader2, Search, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Reveal, Stagger, StaggerItem } from '@/components/motion/primitives';
import { listCodingProblems, type CodingProblemListItem } from '@/lib/api/coding';

const DIFF_TONE: Record<string, string> = {
  EASY: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  MEDIUM: 'bg-amber-50 text-amber-700 ring-amber-200',
  HARD: 'bg-rose-50 text-rose-700 ring-rose-200',
};

/**
 * Coding problem catalogue. With a `company` slug it scopes to the problems that
 * company has asked (used inside the company hub's Coding tab); without one it
 * lists the full active bank. With a `topic` it narrows to a single coding topic
 * (used by the Practice → Coding section's topic chips).
 */
export function CodingProblemsList({ company, topic }: { company?: string; topic?: string } = {}) {
  const [problems, setProblems] = useState<CodingProblemListItem[] | null>(null);
  const [errored, setErrored] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    let cancelled = false;
    listCodingProblems(company)
      .then((p) => {
        if (!cancelled) setProblems(p);
      })
      .catch(() => {
        if (!cancelled) setErrored(true);
      });
    return () => {
      cancelled = true;
    };
  }, [company]);

  // When a topic is selected, keep only problems carrying that tag (case-insensitive,
  // any position — a problem tagged [Arrays, Hashing] shows for both). Then apply the
  // free-text search (matches the title or any tag).
  const filtered = useMemo(() => {
    let all = problems ?? [];
    if (topic) {
      const t = topic.trim().toLowerCase();
      all = all.filter((p) => p.tags?.some((tag) => tag.trim().toLowerCase() === t));
    }
    const needle = q.trim().toLowerCase();
    if (needle) {
      all = all.filter(
        (p) =>
          p.title.toLowerCase().includes(needle) ||
          p.tags?.some((tag) => tag.toLowerCase().includes(needle)),
      );
    }
    return all;
  }, [problems, topic, q]);

  // Group problems by their primary tag (the topic) so the catalogue reads
  // topic-wise, matching the Practice Quiz tab. Ordered by size, then name.
  const groups = useMemo(() => {
    const map = new Map<string, CodingProblemListItem[]>();
    for (const p of filtered) {
      const primary = (p.tags?.[0] ?? '').trim() || 'General';
      const list = map.get(primary) ?? [];
      list.push(p);
      map.set(primary, list);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  }, [filtered]);

  if (errored) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
        Couldn&apos;t load problems. Please refresh.
      </div>
    );
  }
  if (!problems) {
    return (
      <div className="flex h-48 items-center justify-center text-slate-400">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }
  if (problems.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-10 text-center shadow-sm">
        <Code2 className="mx-auto mb-3 size-8 text-slate-300" />
        <p className="text-sm font-semibold text-navy">No coding problems yet</p>
        <p className="mt-1 text-sm text-slate-500">
          {topic
            ? `No coding problems tagged “${topic}” yet - check back soon.`
            : company
              ? 'No coding problems tagged for this company yet - check back soon.'
              : 'Check back soon - new problems are on the way.'}
        </p>
      </div>
    );
  }

  const solvedCount = filtered.filter((p) => p.solved).length;

  return (
    <div className="space-y-5">
      <Reveal>
        <div data-tour="coding:progress" className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-indigo-300/20 blur-2xl"
          />
          <div className="relative flex flex-wrap items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-400 to-indigo-600 text-white">
              <Trophy className="size-5" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-bold text-navy">
                {solvedCount} / {filtered.length} solved
              </p>
              <p className="text-xs text-slate-500">
                Earn XP for every problem you solve for the first time.
              </p>
            </div>
            {/* Search - filter by problem title or tag */}
            <div data-tour="coding:search" className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search problems or tags…"
                aria-label="Search coding problems"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-navy outline-none transition focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
              />
            </div>
          </div>
        </div>
      </Reveal>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-10 text-center shadow-sm">
          <Search className="mx-auto mb-3 size-8 text-slate-300" />
          <p className="text-sm font-semibold text-navy">No problems match “{q}”</p>
          <button
            type="button"
            onClick={() => setQ('')}
            className="mt-2 text-sm font-bold text-indigo-600 hover:text-indigo-700"
          >
            Clear search
          </button>
        </div>
      )}

      {/* Topic-wise sections (like the Practice Quiz tab) */}
      {groups.map(([topic, items]) => {
        const groupSolved = items.filter((p) => p.solved).length;
        return (
          <section key={topic} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 ring-1 ring-inset ring-indigo-100">
                <Code2 className="size-3.5" /> {topic}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                {groupSolved}/{items.length} solved
              </span>
              <span className="h-px flex-1 bg-slate-100" />
            </div>
            <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((p) => (
                <StaggerItem key={p.id} className="h-full">
                  <ProblemCard p={p} />
                </StaggerItem>
              ))}
            </Stagger>
          </section>
        );
      })}
    </div>
  );
}

function ProblemCard({ p }: { p: CodingProblemListItem }) {
  return (
    <Link
      href={`/coding/${p.slug}`}
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-[0_18px_40px_-22px_rgba(15,23,42,0.4)]',
        p.solved
          ? 'border-emerald-300 bg-emerald-50/60 ring-1 ring-inset ring-emerald-200/70'
          : 'border-slate-200/80 bg-white',
      )}
    >
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -right-10 -top-10 size-28 rounded-full blur-2xl',
          p.solved ? 'bg-emerald-300/30' : 'bg-indigo-300/15',
        )}
      />
      <div className="relative flex items-center justify-between">
        <span
          className={cn(
            'rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset',
            DIFF_TONE[p.difficulty] ?? DIFF_TONE.EASY,
          )}
        >
          {p.difficulty}
        </span>
        {p.solved ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            <CheckCircle2 className="size-3.5" /> Solved
          </span>
        ) : (
          <Code2 className="size-5 text-slate-300" />
        )}
      </div>
      <h3 className="relative mt-3 text-[15px] font-extrabold leading-snug text-navy">{p.title}</h3>
      {p.tags.length ? (
        <div className="relative mt-2 flex flex-wrap gap-1.5">
          {p.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className={cn(
                'rounded-md px-2 py-0.5 text-[10px] font-medium',
                p.solved ? 'bg-emerald-100/70 text-emerald-700' : 'bg-slate-100 text-slate-500',
              )}
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}
      <div className="relative mt-auto flex items-center justify-between pt-4">
        <span className="text-[12px] font-bold text-orange">+{p.xpReward} XP</span>
        <span
          className={cn(
            'inline-flex items-center gap-1 text-[12px] font-bold group-hover:text-navy',
            p.solved ? 'text-emerald-600' : 'text-slate-400',
          )}
        >
          {p.solved ? 'Review' : 'Solve'}{' '}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
