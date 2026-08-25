'use client';

import { useState } from 'react';
import { CalendarPlus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Google wants UTC, compact, no punctuation: 20260916T051500Z. */
const stamp = (d: Date): string => d.toISOString().replace(/[-:]|\.\d{3}/g, '');

/**
 * Put this in the student's own calendar.
 *
 * Two routes, because there is no single one that works for everybody: Google covers
 * most students on a laptop, and the .ics download covers Outlook, Apple Calendar and
 * every phone that opens a calendar file. Offering only Google would quietly exclude
 * anyone not signed into it.
 *
 * The .ics is built as a Blob rather than fetched: the whole event is already known
 * client-side, so a round trip would buy nothing but a failure mode.
 */
export function AddToCalendarButton({
  title,
  startsAt,
  endsAt,
  description,
  location,
  className,
}: {
  title: string;
  startsAt: string;
  endsAt?: string | null;
  description?: string;
  location?: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);
  const start = new Date(startsAt);
  // A deadline has no duration; give it a nominal half hour so it is visible as a block
  // rather than a zero-length event some calendars refuse to render.
  const end = endsAt ? new Date(endsAt) : new Date(start.getTime() + 30 * 60_000);

  const googleUrl =
    'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${stamp(start)}/${stamp(end)}` +
    (description ? `&details=${encodeURIComponent(description)}` : '') +
    (location ? `&location=${encodeURIComponent(location)}` : '');

  const downloadIcs = () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//prephasz//EN',
      'BEGIN:VEVENT',
      `UID:${stamp(start)}-${Math.abs(hash(title))}@prephasz.com`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${escapeIcs(title)}`,
      description ? `DESCRIPTION:${escapeIcs(description)}` : '',
      location ? `LOCATION:${escapeIcs(location)}` : '',
      'END:VEVENT',
      'END:VCALENDAR',
    ]
      .filter(Boolean)
      .join('\r\n');

    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  };

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <a
        href={googleUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-navy transition-colors hover:bg-slate-50"
      >
        <CalendarPlus className="size-3.5 text-slate-400" /> Google Calendar
      </a>
      <button
        type="button"
        onClick={downloadIcs}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-navy transition-colors hover:bg-slate-50"
      >
        {done ? <Check className="size-3.5 text-emerald-600" /> : <CalendarPlus className="size-3.5 text-slate-400" />}
        Outlook / Apple
      </button>
    </span>
  );
}

/** Commas, semicolons and newlines are field separators in iCalendar. */
const escapeIcs = (s: string): string =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

const hash = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h << 5) - h + s.charCodeAt(i);
  return h;
};
