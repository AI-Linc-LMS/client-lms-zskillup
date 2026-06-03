'use client';

import Link from 'next/link';
import { Play } from 'lucide-react';
import { ProgressBar } from '@/components/ui/progress-bar';
import { DEMO_CONTINUE } from '@/lib/demo-data';

export function ContinueLearning() {
  const c = DEMO_CONTINUE;
  return (
    <section className="rounded-xl border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-navy">Continue Learning</h2>
          <p className="text-xs text-muted-foreground">Resume where you left off</p>
        </div>
        <Link href="/my-learning" className="text-xs font-semibold text-orange hover:underline">
          View all →
        </Link>
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Current module
          </p>
          <p className="mt-1.5 font-semibold leading-snug text-navy">{c.currentModule}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{c.moduleMeta}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Next lesson
          </p>
          <p className="mt-1.5 font-semibold leading-snug text-navy">{c.nextLesson}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{c.nextLessonMeta}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Module outcome
          </p>
          <p className="mt-1.5 text-sm leading-snug text-navy">{c.outcome}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{c.outcomeMeta}</p>
        </div>
      </div>

      <div className="mt-5">
        <ProgressBar value={c.percent} />
        <p className="mt-1 text-xs text-muted-foreground">
          {c.percent}% complete · {c.remaining}
        </p>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Link
          href="/practice?topic=percentages"
          className="inline-flex items-center gap-2 rounded-full bg-orange px-5 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
        >
          <Play className="size-4 fill-white" aria-hidden="true" />
          Resume
        </Link>
        <Link
          href="/my-learning"
          className="text-sm font-medium text-slate-500 transition-colors hover:text-navy"
        >
          Skip
        </Link>
      </div>
    </section>
  );
}
