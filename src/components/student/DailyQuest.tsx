'use client';

import { Zap } from 'lucide-react';
import { DEMO_QUEST } from '@/lib/demo-data';

export function DailyQuest() {
  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-orange/25 bg-gradient-to-r from-orange/5 to-amber-50/60 px-5 py-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex items-center gap-1.5 rounded-full bg-orange px-3 py-1 text-[11px] font-bold text-white shadow-sm">
          ★ DAILY QUEST
        </span>
        <div>
          <p className="text-sm font-semibold text-navy">{DEMO_QUEST.title}</p>
          <p className="mt-0.5 text-xs">
            <span className="font-medium text-orange">Reward:</span>{' '}
            <span className="font-semibold text-orange">+150 XP</span>
            <span className="text-muted-foreground"> · </span>
            <span className="font-semibold text-amber-600">30 coins</span>
            <span className="text-muted-foreground"> · </span>
            <span className="font-semibold text-sky-600">Speedster badge</span>
          </p>
        </div>
      </div>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-full bg-orange px-5 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 active:scale-95"
      >
        <Zap className="size-4" aria-hidden="true" />
        Start quest
      </button>
    </section>
  );
}
