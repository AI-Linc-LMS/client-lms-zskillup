'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarClock, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMySchedule, type ApiScheduledAssessment } from '@/lib/api/scheduling';

function dueLabel(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'now';
  const d = Math.floor(ms / 86_400_000);
  if (d >= 1) return `in ${d}d`;
  const h = Math.floor(ms / 3_600_000);
  if (h >= 1) return `in ${h}h`;
  return `in ${Math.max(1, Math.floor(ms / 60_000))}m`;
}

/**
 * Compact upcoming-assessments list for the left nav rail (students). Fills the
 * space below the menu; live drives are highlighted and start in one tap. Hidden
 * when the student has nothing scheduled.
 */
export function SidebarUpcoming() {
  const [items, setItems] = useState<ApiScheduledAssessment[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMySchedule()
      .then((s) => {
        if (cancelled) return;
        setItems(
          s
            .filter(
              (a) =>
                a.isActive &&
                new Date(a.scheduledAt).getTime() + a.durationMinutes * 60_000 >= Date.now(),
            )
            .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt))
            .slice(0, 4),
        );
      })
      .catch(() => setItems([]));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <div className="relative z-10 max-h-[60%] shrink-0 overflow-y-auto border-t border-[var(--color-line)] bg-white px-3 pb-4 pt-4">
      <div className="mb-2 flex items-center justify-between px-2">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <CalendarClock className="size-3.5 text-orange" /> Upcoming
        </p>
        <Link href="/calendar" className="text-[10px] font-bold text-orange hover:underline">
          All
        </Link>
      </div>
      <ul className="space-y-1.5">
        {items.map((a) => {
          const startMs = new Date(a.scheduledAt).getTime();
          const live = Date.now() >= startMs && Date.now() <= startMs + a.durationMinutes * 60_000;
          return (
            <li key={a.id}>
              <Link
                href={
                  live && a.mockTestId
                    ? `/dashboard/quiz?mock=${a.mockTestId}${a.proctored ? '&proctored=1' : ''}`
                    : '/calendar'
                }
                className={cn(
                  'block rounded-xl border p-2.5 transition-colors',
                  live
                    ? 'border-emerald-300 bg-emerald-50/60 hover:bg-emerald-50'
                    : 'border-slate-200 bg-white hover:border-orange/40 hover:bg-orange/[0.04]',
                )}
              >
                <p className="flex items-center gap-1.5 truncate text-[12px] font-bold text-navy">
                  {a.proctored ? <ShieldCheck className="size-3 shrink-0 text-violet-500" /> : null}
                  <span className="truncate">{a.title}</span>
                </p>
                <p className="mt-0.5 flex items-center justify-between gap-2 text-[10px] font-semibold">
                  <span className="truncate text-slate-400">{a.companyName}</span>
                  <span className={cn('shrink-0', live ? 'text-emerald-600' : 'text-slate-500')}>
                    {live ? '● Live' : `Due ${dueLabel(a.scheduledAt)}`}
                  </span>
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
