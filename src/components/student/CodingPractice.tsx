'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { listCodingProblems, type CodingProblemListItem } from '@/lib/api/coding';

const DIFF_DOT: Record<string, string> = {
  EASY: 'bg-emerald-400',
  MEDIUM: 'bg-amber-400',
  HARD: 'bg-rose-400',
};

/**
 * Dashboard Coding widget — a compact teaser of coding problems that links into
 * the full /coding workspace. Surfaces unsolved problems first so the student
 * always sees the next thing to attempt.
 */
export function CodingPractice() {
  const [problems, setProblems] = useState<CodingProblemListItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listCodingProblems()
      .then((p) => {
        if (!cancelled) setProblems(p);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!problems || problems.length === 0) return null;

  const solved = problems.filter((p) => p.solved).length;
  // Unsolved first, then by reward — show the next 3 worth attempting.
  const featured = [...problems]
    .sort((a, b) => Number(a.solved) - Number(b.solved) || b.xpReward - a.xpReward)
    .slice(0, 3);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-indigo-300/20 blur-2xl"
      />
      <div className="relative mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-500">
          <Code2 className="size-3.5" /> Coding practice
        </p>
        <span className="text-[11px] font-semibold text-slate-400">
          {solved} / {problems.length} solved
        </span>
      </div>

      <div className="relative space-y-2">
        {featured.map((p) => (
          <Link
            key={p.id}
            href={`/coding/${p.slug}`}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40"
          >
            <span className={cn('size-2 shrink-0 rounded-full', DIFF_DOT[p.difficulty] ?? DIFF_DOT.EASY)} />
            <span className="flex-1 truncate text-sm font-semibold text-navy">{p.title}</span>
            {p.solved ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
            ) : (
              <span className="shrink-0 text-[11px] font-bold text-orange">+{p.xpReward}</span>
            )}
          </Link>
        ))}
      </div>

      <Link
        href="/coding"
        className="relative mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-700"
      >
        Open coding workspace <ArrowRight className="size-4" />
      </Link>
    </section>
  );
}
