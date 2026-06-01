import { Flame } from 'lucide-react';

export function StreakPill({ days }: { days: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-orange px-3 py-1 text-[11px] font-bold text-white shadow-sm">
      <Flame className="size-3.5" aria-hidden="true" />
      {days} DAY STREAK
    </span>
  );
}
