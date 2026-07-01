'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Code2, Loader2, Trophy } from 'lucide-react';
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
 * lists the full active bank.
 */
export function CodingProblemsList({ company }: { company?: string } = {}) {
  const [problems, setProblems] = useState<CodingProblemListItem[] | null>(null);
  const [errored, setErrored] = useState(false);

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

  // Group problems by their primary tag (the topic) so the catalogue reads
  // topic-wise, matching the Practice Quiz tab. Ordered by size, then name.
  const groups = useMemo(() => {
    const map = new Map<string, CodingProblemListItem[]>();
    for (const p of problems ?? []) {
      const topic = (p.tags?.[0] ?? '').trim() || 'General';
      const list = map.get(topic) ?? [];
      list.push(p);
      map.set(topic, list);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  }, [problems]);

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
          {company
            ? 'No coding problems tagged for this company yet — check back soon.'
            : 'Check back soon — new problems are on the way.'}
        </p>
      </div>
    );
  }

  const solvedCount = problems.filter((p) => p.solved).length;

  return (
    <div className="space-y-5">
      <Reveal>
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-indigo-300/20 blur-2xl"
          />
          <div className="relative flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-400 to-indigo-600 text-white">
              <Trophy className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-navy">
                {solvedCount} / {problems.length} solved
              </p>
              <p className="text-xs text-slate-500">
                Earn XP for every problem you solve for the first time.
              </p>
            </div>
          </div>
        </div>
      </Reveal>

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
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-[0_18px_40px_-22px_rgba(15,23,42,0.4)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-indigo-300/15 blur-2xl"
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
          <CheckCircle2 className="size-5 text-emerald-500" />
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
              className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500"
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}
      <div className="relative mt-auto flex items-center justify-between pt-4">
        <span className="text-[12px] font-bold text-orange">+{p.xpReward} XP</span>
        <span className="inline-flex items-center gap-1 text-[12px] font-bold text-slate-400 group-hover:text-navy">
          {p.solved ? 'Review' : 'Solve'}{' '}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
