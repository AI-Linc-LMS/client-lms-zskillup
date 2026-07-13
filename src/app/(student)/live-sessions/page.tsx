'use client';

import { useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { CalendarClock, Clock, Loader2, PlayCircle, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { listMyLiveSessions, type LiveSessionDto, type LiveSessionListDto } from '@/lib/api/live-sessions';
import { AudiencePill, fmtWhen, relWhen, safeHttpUrl, StatusBadge } from '@/components/live-sessions/ui';

export default function StudentLiveSessionsPage() {
  const [data, setData] = useState<LiveSessionListDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMyLiveSessions()
      .then(setData)
      .catch(() => setData({ upcoming: [], past: [] }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Live Sessions' }]} />

      <header data-tour="live:intro">
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-navy">
          <Video className="size-6 text-orange" /> Live Sessions
        </h1>
        <p className="mt-0.5 text-sm text-slate-600">Masterclasses & webinars scheduled for you. Join right from here.</p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="size-7 animate-spin text-slate-500" /></div>
      ) : !data || (data.upcoming.length === 0 && data.past.length === 0) ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <CalendarClock className="mx-auto size-10 text-slate-400" />
          <p className="mt-3 text-sm text-slate-600">No live sessions scheduled yet. We&apos;ll notify you when one is set up.</p>
        </div>
      ) : (
        <>
          {data.upcoming.length > 0 && (
            <section className="space-y-3" data-tour="live:upcoming">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Upcoming</h2>
              <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                {data.upcoming.map((s) => <StudentCard key={s.id} s={s} />)}
              </div>
            </section>
          )}
          {data.past.length > 0 && (
            <section className="space-y-3" data-tour="live:past">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Past</h2>
              <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                {data.past.map((s) => <StudentCard key={s.id} s={s} past />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function StudentCard({ s, past }: { s: LiveSessionDto; past?: boolean }) {
  const link = safeHttpUrl(s.meetingUrl);
  const recording = safeHttpUrl(s.recordingUrl);
  const isLive = s.status === 'LIVE';
  return (
    <div data-tour="live:session-card" className={cn('rounded-2xl border bg-white p-5 shadow-sm', isLive ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-200')}>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={s.status} />
        <AudiencePill audience={s.audience} companyName={s.companyName} />
        {!past && <span className="text-xs font-semibold text-slate-500">· {relWhen(s.scheduledAt)}</span>}
      </div>

      <h3 className="mt-2.5 text-lg font-black text-navy">{s.title}</h3>
      {s.description && <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{s.description}</p>}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {fmtWhen(s.scheduledAt)}</span>
          <span>{s.durationMinutes} min</span>
        </div>
        {!past && link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold text-white shadow-sm transition-colors',
              isLive ? 'bg-red-500 hover:bg-red-600' : 'bg-navy hover:bg-navy/90',
            )}
          >
            <Video className="size-4" /> {isLive ? 'Join now' : 'Join'}
          </a>
        ) : past && recording ? (
          <a
            href={recording}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-navy px-5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-navy/90"
          >
            <PlayCircle className="size-4" /> Watch recording
          </a>
        ) : past ? (
          <span className="text-xs font-semibold text-slate-500">Session ended</span>
        ) : null}
      </div>
    </div>
  );
}
