'use client';

import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DecayParams } from '@/lib/api/adaptive';

/**
 * Live time-decay points meter (ai-linc parity). Replicates the server scorer
 * BYTE-FOR-BYTE off the question's `servedAt` anchor, so the "worth now" value it
 * shows is exactly what will be awarded on a correct submit. Counts down from
 * `base` (green, during grace) → amber (decaying) → `floor` (red). Anchoring on
 * the server timestamp means a resumed question shows the already-decayed value.
 */

function pointsAfterDecay(tSeconds: number, d: DecayParams): number {
  if (tSeconds <= d.grace) return d.base;
  const intervals = Math.floor((tSeconds - d.grace) / d.iv);
  return Math.max(d.floor, d.base - d.dec * intervals);
}

export function LivePointsMeter({
  points,
  servedAt,
  hinted = false,
  className,
}: {
  points: DecayParams;
  servedAt: string;
  hinted?: boolean;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const anchor = Date.parse(servedAt);
  const elapsed = Math.max(0, (now - (Number.isFinite(anchor) ? anchor : now)) / 1000);
  const raw = pointsAfterDecay(elapsed, points);
  const penalty = hinted ? 1 - points.hintPenalty : 1;
  const worth = Math.round(raw * penalty);

  const inGrace = elapsed <= points.grace;
  const atFloor = raw <= points.floor;
  const tone = inGrace
    ? 'text-emerald-600 ring-emerald-200 bg-emerald-50'
    : atFloor
      ? 'text-rose-600 ring-rose-200 bg-rose-50'
      : 'text-amber-600 ring-amber-200 bg-amber-50';
  const graceLeft = Math.max(0, Math.ceil(points.grace - elapsed));

  return (
    <div className={cn('rounded-2xl border border-slate-200/80 bg-white p-3', className)}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Worth right now</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className={cn('inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-2xl font-black tabular-nums ring-1 ring-inset', tone)}>
          <Zap className="size-4" /> {worth}
        </span>
        <span className="text-xs font-medium text-slate-500">/ {points.base} pts</span>
      </div>
      <p className="mt-1 text-[11px] font-medium text-slate-600">
        {inGrace ? (
          <span className="text-emerald-600">Full points for {graceLeft}s - answer fast!</span>
        ) : atFloor ? (
          <span className="text-rose-500">At the floor - still worth {worth}.</span>
        ) : (
          <span>Ticking down every {points.iv}s…</span>
        )}
        {hinted ? <span className="text-amber-600"> · −{Math.round(points.hintPenalty * 100)}% hint</span> : null}
      </p>
    </div>
  );
}
