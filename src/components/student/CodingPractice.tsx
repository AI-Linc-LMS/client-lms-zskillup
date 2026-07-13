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
    <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6">
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#f5b400] via-[#ffc42d] to-[#ffd24d]" />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-[#ffc42d]/20 blur-3xl"
      />
      <div className="relative mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-2xl font-black tracking-tight text-navy">
          <Code2 className="size-5 text-[#f5b400]" /> Coding practice
        </h3>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold tabular-nums text-slate-600">
          {solved} / {problems.length} solved
        </span>
      </div>

      <div className="relative space-y-2">
        {featured.map((p) => (
          <Link
            key={p.id}
            href={`/coding/${p.slug}`}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5 transition-colors hover:border-[#ffc42d]/40 hover:bg-[#fff5ea]"
          >
            <span className={cn('size-2 shrink-0 rounded-full', DIFF_DOT[p.difficulty] ?? DIFF_DOT.EASY)} />
            <span className="flex-1 truncate text-sm font-semibold text-navy">{p.title}</span>
            {p.solved ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
            ) : (
              <span className="shrink-0 text-[11px] font-bold text-[#f5b400]">+{p.xpReward}</span>
            )}
          </Link>
        ))}
      </div>

      <Link
        href="/dashboard/company"
        className="relative mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[#1a1d29] hover:text-[#f5b400]"
      >
        Browse coding by company <ArrowRight className="size-4" />
      </Link>
    </section>
  );
}
