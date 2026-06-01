import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEMO_ACTIVITY, DEMO_DEADLINES, DEMO_WEEK } from '@/lib/demo-data';

const URGENCY_CARD: Record<string, string> = {
  high: 'border-red-200 bg-red-50',
  medium: 'border-amber-200 bg-amber-50',
  low: 'border-slate-200 bg-white',
};

const URGENCY_DUE: Record<string, string> = {
  high: 'text-red-600 font-semibold',
  medium: 'text-amber-600 font-semibold',
  low: 'text-slate-500',
};

const ACTIVITY_DOTS = ['bg-orange', 'bg-emerald-500', 'bg-sky-500', 'bg-violet-500'];

export function DashboardRightRail() {
  return (
    <div className="space-y-5">
      {/* Upcoming Deadlines */}
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Upcoming Deadlines
          </h2>
          <Link href="/assignments" className="text-[11px] font-semibold text-orange hover:underline">
            View all
          </Link>
        </div>
        <div className="space-y-2.5">
          {DEMO_DEADLINES.map((d) => (
            <div key={d.title} className={cn('rounded-lg border p-3', URGENCY_CARD[d.urgency])}>
              <p className="text-sm font-semibold leading-snug text-navy">{d.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{d.meta}</p>
              <p className={cn('mt-1 text-[11px]', URGENCY_DUE[d.urgency])}>{d.due}</p>
            </div>
          ))}
        </div>
      </section>

      {/* This Week */}
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          <Calendar className="size-3.5" aria-hidden="true" />
          This Week
        </h2>
        <div className="flex justify-between">
          {DEMO_WEEK.days.map((day) => (
            <div key={day.d} className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-medium uppercase text-muted-foreground">{day.d}</span>
              <span
                className={cn(
                  'grid size-8 place-items-center rounded-lg text-xs font-semibold',
                  day.today
                    ? 'bg-navy text-white shadow-sm'
                    : 'text-foreground hover:bg-slate-100',
                )}
              >
                {day.n}
              </span>
              <span
                className={cn('size-1.5 rounded-full', day.dot ? 'bg-orange' : 'bg-transparent')}
              />
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">⏱ {DEMO_WEEK.summary}</p>
      </section>

      {/* Recent Activity */}
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Recent Activity
        </h2>
        <ul className="space-y-3">
          {DEMO_ACTIVITY.map((a, i) => (
            <li key={a.text} className="flex gap-2.5">
              <span
                className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', ACTIVITY_DOTS[i % ACTIVITY_DOTS.length])}
                aria-hidden="true"
              />
              <div>
                <p className="text-xs font-medium leading-snug text-foreground">{a.text}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{a.when}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
