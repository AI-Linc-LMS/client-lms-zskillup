'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { CalendarClock, Clock, Loader2, PlayCircle, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  listMyLiveSessions,
  markLiveSessionInterest,
  registerForLiveSession,
  type LiveSessionDto,
  type LiveSessionListDto,
} from '@/lib/api/live-sessions';
import { AudiencePill, fmtWhen, relWhen, safeHttpUrl, StatusBadge } from '@/components/live-sessions/ui';

export default function StudentLiveSessionsPage() {
  const [data, setData] = useState<LiveSessionListDto | null>(null);
  const [loading, setLoading] = useState(true);

  // Re-fetchable: registering releases the join link, so the card must refresh from the
  // SERVER rather than optimistically revealing a URL it was never sent.
  const load = useCallback(() => {
    listMyLiveSessions()
      .then(setData)
      .catch(() => setData({ upcoming: [], past: [] }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
                {data.upcoming.map((s) => <StudentCard key={s.id} s={s} onChanged={load} />)}
              </div>
            </section>
          )}
          {data.past.length > 0 && (
            <section className="space-y-3" data-tour="live:past">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Past</h2>
              <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                {data.past.map((s) => <StudentCard key={s.id} s={s} past onChanged={load} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function StudentCard({ s, past, onChanged }: { s: LiveSessionDto; past?: boolean; onChanged?: () => void }) {
  const [busy, setBusy] = useState(false);
  // A FREE student must register before the join link is released; a PAYING student is
  // only invited to say they're interested, which never gates them. The server decides
  // which case this is (mustRegister) and simply withholds meetingUrl until satisfied -
  // the button below never grants access on its own.
  const registered = s.signupKind === 'REGISTERED';
  const interested = s.signupKind === 'INTERESTED';
  const needsRegistration = !past && s.mustRegister && !registered;

  const signUp = async (kind: 'register' | 'interest') => {
    setBusy(true);
    try {
      if (kind === 'register') await registerForLiveSession(s.id);
      else await markLiveSessionInterest(s.id);
      toast.success(kind === 'register' ? "You're registered - the join link is ready." : 'Noted - thanks for telling us.');
      onChanged?.();
    } catch {
      toast.error('Could not save that. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const link = safeHttpUrl(s.meetingUrl);
  const recording = safeHttpUrl(s.recordingUrl);
  const isLive = s.status === 'LIVE';
  const speakerLine = [s.speakerRole, s.speakerCompany].filter(Boolean).join(' · ');
  const hasSpeaker = Boolean(s.speakerName || s.speakerBio);
  return (
    <div data-tour="live:session-card" className={cn('overflow-hidden rounded-2xl border bg-white shadow-sm', isLive ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-200')}>
      {s.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={s.coverImageUrl} alt="" className="h-36 w-full object-cover" />
      )}
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={s.status} />
          <AudiencePill audience={s.audience} companyName={s.companyName} />
          {!past && <span className="text-xs font-semibold text-slate-500">· {relWhen(s.scheduledAt)}</span>}
        </div>

        <h3 className="mt-2.5 text-lg font-black text-navy">{s.title}</h3>
        {s.description && <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{s.description}</p>}

        {hasSpeaker && (
          <div className="mt-3 flex items-start gap-3 border-t border-slate-100 pt-3">
            {s.speakerAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.speakerAvatarUrl} alt="" className="size-10 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sky-50 text-xs font-bold text-sky-600 ring-1 ring-sky-100">
                {speakerInitials(s.speakerName)}
              </span>
            )}
            <div className="min-w-0">
              {s.speakerName && <p className="text-sm font-bold text-navy">{s.speakerName}</p>}
              {speakerLine && <p className="text-xs font-medium text-slate-500">{speakerLine}</p>}
              {s.speakerBio && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{s.speakerBio}</p>}
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {fmtWhen(s.scheduledAt)}</span>
            <span>{s.durationMinutes} min</span>
          </div>
          {needsRegistration ? (
            // Registration URL if the admin hosts it elsewhere, otherwise register in-app.
            safeHttpUrl(s.registrationUrl) ? (
              <a
                href={safeHttpUrl(s.registrationUrl) as string}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-orange px-5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-orange/90"
              >
                Register
              </a>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => void signUp('register')}
                className="inline-flex items-center gap-2 rounded-full bg-orange px-5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-orange/90 disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null} Register to join
              </button>
            )
          ) : !past && link ? (
            <span className="flex items-center gap-2">
              {/* Paying students are never asked to register - this is demand signal
                  only, and deliberately sits BESIDE Join rather than in front of it. */}
              {!s.mustRegister ? (
                <button
                  type="button"
                  disabled={busy || interested}
                  onClick={() => void signUp('interest')}
                  className={cn(
                    'rounded-full px-3 py-2 text-xs font-bold transition-colors',
                    interested
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  )}
                >
                  {interested ? "You're interested" : "I'm interested"}
                </button>
              ) : null}
            </span>
          ) : null}
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
    </div>
  );
}

/** Two-letter initials for the speaker avatar fallback. */
function speakerInitials(name: string | null): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '★';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}
