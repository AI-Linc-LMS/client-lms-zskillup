'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock, Sparkles, Zap } from 'lucide-react';
import { getDailyQuest, type ApiDailyQuest } from '@/lib/api/gamification';

function questHref(quest: ApiDailyQuest): string {
  if (quest.kind === 'MOCK') return `/mock-assessment`;
  return `/practice`;
}

export function DailyQuest() {
  const [quest, setQuest] = useState<ApiDailyQuest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getDailyQuest()
      .then((q) => { if (!cancelled) { setQuest(q); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <section className="quest-card animate-pulse">
        <div className="h-4 w-48 rounded bg-white/30" />
        <div className="mt-2 h-3 w-64 rounded bg-white/20" />
      </section>
    );
  }

  if (!quest) {
    return (
      <section className="quest-card" data-tour="dash:daily-quest">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-brand)] px-3 py-1 text-[11px] font-bold text-[#171717]">
              <Sparkles className="h-3 w-3" aria-hidden />
              TODAY&apos;S FOCUS
            </span>
            <div>
              <p className="text-lg font-extrabold text-[var(--color-ink)]">
                Sharpen percentages - the most-tested NQT quant topic
              </p>
              <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
                Server-graded questions with instant hints and step-by-step explanations.
              </p>
            </div>
          </div>
          <Link href="/dashboard/quiz/adaptive?topic=percentages" className="btn-brand inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-2 text-sm font-bold text-[#171717]">
            <Zap className="h-4 w-4" aria-hidden />
            Start practising
          </Link>
        </div>
      </section>
    );
  }

  const isCompleted = quest.status === 'COMPLETED';
  const isMissed = quest.status === 'MISSED';

  return (
    <section className="quest-card" data-tour="dash:daily-quest">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-brand)] px-3 py-1 text-[11px] font-bold text-[#171717]">
            {isCompleted ? (
              <CheckCircle2 className="h-3 w-3" aria-hidden />
            ) : isMissed ? (
              <Clock className="h-3 w-3" aria-hidden />
            ) : (
              <Sparkles className="h-3 w-3" aria-hidden />
            )}
            {isCompleted ? 'COMPLETED' : isMissed ? 'MISSED' : "TODAY'S QUEST"}
          </span>

          <div>
            <p className="text-lg font-extrabold text-[var(--color-ink)]">{quest.title}</p>
            <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
              {isCompleted
                ? `Earned +${quest.xpReward} XP · +${quest.coinReward} coins`
                : isMissed
                  ? 'Quest expired - a new one arrives tomorrow'
                  : `Complete to earn +${quest.xpReward} XP · +${quest.coinReward} coins`}
            </p>
          </div>
        </div>

        {!isCompleted && !isMissed && (
          <Link
            href={questHref(quest)}
            className="btn-brand inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-2 text-sm font-bold text-[#171717]"
          >
            <Zap className="h-4 w-4" aria-hidden />
            {quest.kind === 'MOCK' ? 'Take mock test' : 'Start practising'}
          </Link>
        )}

        {isCompleted && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-green-300 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Done for today
          </span>
        )}
      </div>
    </section>
  );
}
