'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  ShieldCheck,
  Video,
} from 'lucide-react';
import { getMySchedule, type ApiScheduledAssessment } from '@/lib/api/scheduling';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { cn } from '@/lib/utils';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}
function countdown(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0) return 'Past';
  const days = Math.floor(ms / 86400000);
  if (days >= 1) return `in ${days} day${days === 1 ? '' : 's'}`;
  const hrs = Math.floor(ms / 3600000);
  if (hrs >= 1) return `in ${hrs}h`;
  return 'soon';
}

/** Student assessment calendar (assessment lifecycle, Phase 2). Scheduled drives
 *  for the companies the student registered for — blocked days + a timeline. */
export default function CalendarPage() {
  const [items, setItems] = useState<ApiScheduledAssessment[] | null>(null);
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });

  useEffect(() => {
    getMySchedule()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  const byDay = useMemo(() => {
    const map = new Map<string, ApiScheduledAssessment[]>();
    for (const it of items ?? []) {
      const k = dayKey(new Date(it.scheduledAt));
      (map.get(k) ?? map.set(k, []).get(k)!).push(it);
    }
    return map;
  }, [items]);

  const upcoming = useMemo(
    () =>
      (items ?? [])
        .filter((i) => new Date(i.scheduledAt).getTime() >= Date.now() - 86400000)
        .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt)),
    [items],
  );

  // Build the month grid.
  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const out: (Date | null)[] = [];
    for (let i = 0; i < startDow; i += 1) out.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) out.push(new Date(cursor.year, cursor.month, d));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cursor]);

  const todayKey = dayKey(new Date());

  return (
    <div className="mx-auto max-w-5xl">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Calendar' }]} />

      <div className="mt-4 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-[#1f2d4d] to-[#0b1220] text-white">
          <CalendarDays className="size-5 text-[#ffb877]" />
        </span>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-navy">Assessment calendar</h1>
          <p className="text-sm text-slate-500">
            Drives for the companies you&apos;ve registered for — blocked on your calendar.
          </p>
        </div>
      </div>

      {items === null ? (
        <div className="grid place-items-center py-24">
          <Loader2 className="size-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
          {/* Month grid */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-navy">
                {MONTHS[cursor.month]} {cursor.year}
              </h2>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setCursor((c) =>
                      c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 },
                    )
                  }
                  className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCursor((c) =>
                      c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 },
                    )
                  }
                  className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {DOW.map((d) => (
                <div key={d} className="pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {d}
                </div>
              ))}
              {cells.map((date, i) => {
                if (!date) return <div key={`e${i}`} />;
                const k = dayKey(date);
                const dayItems = byDay.get(k) ?? [];
                const has = dayItems.length > 0;
                const isToday = k === todayKey;
                return (
                  <div
                    key={k}
                    className={cn(
                      'relative flex min-h-[3.5rem] flex-col rounded-xl border p-1.5 text-left',
                      has
                        ? 'border-orange/40 bg-orange/[0.06]'
                        : 'border-slate-100 bg-white',
                      isToday && 'ring-2 ring-navy/30',
                    )}
                  >
                    <span
                      className={cn(
                        'text-[11px] font-bold',
                        has ? 'text-orange' : 'text-slate-500',
                      )}
                    >
                      {date.getDate()}
                    </span>
                    {has ? (
                      <span className="mt-0.5 line-clamp-2 text-[9px] font-semibold leading-tight text-navy">
                        {dayItems[0].companyName}
                        {dayItems.length > 1 ? ` +${dayItems.length - 1}` : ''}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming timeline */}
          <aside className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Upcoming</h2>
            {upcoming.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500">
                No assessments scheduled yet.{' '}
                <Link href="/dashboard/company" className="font-semibold text-orange hover:underline">
                  Register for a drive →
                </Link>
              </div>
            ) : (
              upcoming.map((it) => (
                <div
                  key={it.id}
                  className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                      {it.companyLogoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.companyLogoUrl} alt="" className="max-h-5 max-w-full object-contain" />
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500">
                          {it.companyName.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-navy">{it.companyName}</p>
                      <p className="truncate text-xs text-slate-500">{it.title}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-slate-500">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="size-3.5" /> {fmtDate(it.scheduledAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3.5" /> {fmtTime(it.scheduledAt)} · {it.durationMinutes}m
                    </span>
                    {it.proctored ? (
                      <span className="flex items-center gap-1 text-violet-600">
                        <Video className="size-3.5" /> Proctored
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="rounded-full bg-orange/10 px-2.5 py-1 text-[11px] font-bold text-orange">
                      {countdown(it.scheduledAt)}
                    </span>
                    <Link
                      href={`/dashboard/company/${it.companySlug}`}
                      className="flex items-center gap-1 text-xs font-bold text-navy hover:text-orange"
                    >
                      <ShieldCheck className="size-3.5" /> View hub
                    </Link>
                  </div>
                </div>
              ))
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
