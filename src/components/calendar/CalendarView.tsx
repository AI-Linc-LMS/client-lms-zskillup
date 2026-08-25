'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileCheck2,
  Loader2,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getMyCalendar, type CalendarEventDto } from '@/lib/api/calendar';
import { CalendarEventKind } from '@/shared/dto/calendar.dto';
import { AddToCalendarButton } from './AddToCalendarButton';
import {
  addDays,
  addMonths,
  endOfMonth,
  isSameDay,
  monthGrid,
  startOfMonth,
  startOfWeek,
  toInputDate,
} from '@/lib/calendar';
import { cn } from '@/lib/utils';

type View = 'month' | 'week' | 'list';

const KIND = {
  [CalendarEventKind.LIVE_SESSION]: {
    label: 'Live session',
    icon: Video,
    dot: 'bg-sky-500',
    chip: 'bg-sky-50 text-sky-700 ring-sky-200',
  },
  [CalendarEventKind.ASSESSMENT]: {
    label: 'Assessment',
    icon: FileCheck2,
    dot: 'bg-violet-500',
    chip: 'bg-violet-50 text-violet-700 ring-violet-200',
  },
  [CalendarEventKind.JOB_DEADLINE]: {
    label: 'Job deadline',
    icon: Briefcase,
    dot: 'bg-orange',
    chip: 'bg-orange/10 text-orange ring-orange/25',
  },
} as const;

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

/**
 * Everything a student has coming up, in one place.
 *
 * Three views because they answer different questions: month is "how busy is
 * September", week is "what is happening around now", and the list is the one that
 * actually gets used - it is the only view that can show what each thing IS without
 * hovering, and the only one that works on a phone.
 */
export function CalendarView() {
  const [view, setView] = useState<View>('month');
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [events, setEvents] = useState<CalendarEventDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [kinds, setKinds] = useState<CalendarEventKind[]>([]);
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [selected, setSelected] = useState<Date | null>(null);

  const window = useMemo(() => {
    if (range) return { from: new Date(range.from), to: new Date(`${range.to}T23:59:59`) };
    if (view === 'week') {
      const from = startOfWeek(cursor);
      return { from, to: addDays(from, 7) };
    }
    if (view === 'list') return { from: startOfMonth(cursor), to: addDays(startOfMonth(cursor), 90) };
    // The month grid shows neighbouring days, so fetch what it can display.
    const grid = monthGrid(cursor);
    return { from: grid[0]!, to: grid[41]! };
  }, [view, cursor, range]);

  const load = useCallback(() => {
    setLoading(true);
    getMyCalendar(window.from.toISOString(), window.to.toISOString())
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [window]);

  useEffect(load, [load]);

  const shown = useMemo(
    () => (kinds.length ? events.filter((e) => kinds.includes(e.kind)) : events),
    [events, kinds],
  );

  const byDay = useMemo(() => {
    const m = new Map<string, CalendarEventDto[]>();
    for (const e of shown) {
      const key = toInputDate(new Date(e.startsAt));
      m.set(key, [...(m.get(key) ?? []), e]);
    }
    return m;
  }, [shown]);

  const today = new Date();
  const heading = range
    ? `${new Date(range.from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${new Date(range.to).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : view === 'week'
      ? `Week of ${startOfWeek(cursor).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}`
      : cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous"
            disabled={!!range}
            onClick={() => setCursor((c) => (view === 'week' ? addDays(c, -7) : addMonths(c, -1)))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next"
            disabled={!!range}
            onClick={() => setCursor((c) => (view === 'week' ? addDays(c, 7) : addMonths(c, 1)))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <h2 className="text-lg font-bold text-navy">{heading}</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setRange(null);
            setCursor(startOfMonth(new Date()));
          }}
        >
          Today
        </Button>

        <div className="ml-auto flex gap-1 rounded-lg bg-slate-100 p-1">
          {(['month', 'week', 'list'] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-semibold capitalize transition-colors',
                view === v ? 'bg-white text-navy shadow-sm' : 'text-slate-500 hover:text-navy',
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Filters + range */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {Object.entries(KIND).map(([k, meta]) => {
            const kind = k as CalendarEventKind;
            const on = kinds.includes(kind);
            return (
              <button
                key={k}
                type="button"
                aria-pressed={on}
                onClick={() => setKinds(on ? kinds.filter((x) => x !== kind) : [...kinds, kind])}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                  on ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                <span className={cn('size-2 rounded-full', meta.dot)} /> {meta.label}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Date range
          </span>
          <input
            type="date"
            aria-label="From"
            value={range?.from ?? ''}
            onChange={(e) =>
              setRange((r) => ({ from: e.target.value, to: r?.to || e.target.value }))
            }
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            aria-label="To"
            value={range?.to ?? ''}
            onChange={(e) =>
              setRange((r) => ({ from: r?.from || e.target.value, to: e.target.value }))
            }
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
          />
          {range ? (
            <Button variant="ghost" size="sm" onClick={() => setRange(null)}>
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center rounded-xl border border-slate-200 bg-white py-20 shadow-sm">
          <Loader2 className="size-6 animate-spin text-slate-400" />
        </div>
      ) : view === 'month' && !range ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthGrid(cursor).map((day, i) => {
              const key = toInputDate(day);
              const dayEvents = byDay.get(key) ?? [];
              const outside = day.getMonth() !== cursor.getMonth();
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelected(day)}
                  className={cn(
                    'min-h-24 border-b border-r border-slate-100 p-2 text-left align-top transition-colors hover:bg-slate-50',
                    outside && 'bg-slate-50/60',
                    i % 7 === 6 && 'border-r-0',
                  )}
                >
                  <span
                    className={cn(
                      'inline-grid size-6 place-items-center rounded-full text-xs font-semibold',
                      isSameDay(day, today)
                        ? 'bg-navy text-white'
                        : outside
                          ? 'text-slate-300'
                          : 'text-slate-600',
                    )}
                  >
                    {day.getDate()}
                  </span>
                  <span className="mt-1 flex flex-col gap-1">
                    {dayEvents.slice(0, 3).map((e) => (
                      <span key={e.id} className="flex items-center gap-1">
                        <span className={cn('size-1.5 shrink-0 rounded-full', KIND[e.kind].dot)} />
                        <span className="truncate text-[11px] text-slate-600">{e.title}</span>
                      </span>
                    ))}
                    {dayEvents.length > 3 ? (
                      <span className="text-[11px] font-semibold text-slate-400">
                        +{dayEvents.length - 3} more
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <EventList events={shown} />
      )}

      {selected ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-navy">
              {selected.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
              Close
            </Button>
          </div>
          <div className="mt-3">
            <EventList events={byDay.get(toInputDate(selected)) ?? []} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EventList({ events }: { events: CalendarEventDto[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <span className="mx-auto grid size-11 place-items-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
          <CalendarDays className="size-5" />
        </span>
        <p className="mt-3 text-base font-bold text-navy">Nothing scheduled</p>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-slate-600">
          Live sessions, assessments and application deadlines all show up here as they are
          scheduled.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {events.map((e) => {
        const meta = KIND[e.kind];
        const Icon = meta.icon;
        const when = new Date(e.startsAt);
        return (
          <li key={e.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl ring-1', meta.chip)}>
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <Link href={e.href} className="text-sm font-bold text-navy hover:underline">
                    {e.title}
                  </Link>
                  {e.subtitle ? <p className="truncate text-xs text-slate-500">{e.subtitle}</p> : null}
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="size-3.5" />
                    {when.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {timeOf(e.startsAt)}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1', meta.chip)}>
                  {meta.label}
                </span>
                {e.committed ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    You&apos;re in
                  </span>
                ) : null}
              </div>
            </div>
            <div className="mt-3 border-t border-slate-100 pt-3">
              <AddToCalendarButton
                title={e.title}
                startsAt={e.startsAt}
                endsAt={e.endsAt}
                description={e.subtitle ?? undefined}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
