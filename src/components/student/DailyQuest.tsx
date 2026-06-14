import Link from 'next/link';
import { Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Today's-focus banner (§4.4(d) tinted accent). The full quest engine —
 * server-generated quests, XP/coin rewards, completion tracking — lands in
 * Sprint 5. Until then this slot carries a real, working call-to-action into
 * the live percentage practice flow with no invented reward numbers.
 */
export function DailyQuest() {
  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-orange/25 bg-gradient-to-r from-orange/5 to-amber-50/60 px-5 py-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex items-center gap-1.5 rounded-full bg-orange px-3 py-1 text-[11px] font-bold text-white shadow-sm">
          <Sparkles className="size-3" aria-hidden="true" />
          TODAY&apos;S FOCUS
        </span>
        <div>
          <p className="text-sm font-semibold text-navy">
            Sharpen percentages — the most-tested NQT quant topic
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Server-graded questions with instant hints and step-by-step explanations.
          </p>
        </div>
      </div>
      <Button asChild>
        <Link href="/practice?topic=percentages">
          <Zap className="size-4" aria-hidden="true" />
          Start practising
        </Link>
      </Button>
    </section>
  );
}
