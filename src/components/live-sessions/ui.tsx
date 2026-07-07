'use client';

import { Building2, Globe2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LiveSessionAudience, type LiveSessionStatus } from '@/lib/api/live-sessions';

export const STATUS_CFG: Record<LiveSessionStatus, { label: string; chip: string; dot: string }> = {
  UPCOMING: { label: 'Upcoming', chip: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  LIVE: { label: 'Live now', chip: 'bg-red-50 text-red-600 border-red-200', dot: 'bg-red-500' },
  ENDED: { label: 'Ended', chip: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' },
};

/** Full date + time in IST (server + users are India-based). */
export function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
}

/** Relative "in 2 days" / "in 3h" / "5m ago" label. */
export function relWhen(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const ahead = diff >= 0;
  const mins = Math.round(Math.abs(diff) / 60000);
  let s: string;
  if (mins < 1) s = 'now';
  else if (mins < 60) s = `${mins}m`;
  else if (mins < 1440) s = `${Math.round(mins / 60)}h`;
  else s = `${Math.round(mins / 1440)}d`;
  if (s === 'now') return 'now';
  return ahead ? `in ${s}` : `${s} ago`;
}

/** http(s)-only guard for the meeting link (matches server-side validation). */
export function safeHttpUrl(url: string | null | undefined): string | null {
  const t = (url ?? '').trim();
  return /^https?:\/\//i.test(t) ? t : null;
}

export function StatusBadge({ status }: { status: LiveSessionStatus }) {
  const c = STATUS_CFG[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold', c.chip)}>
      <span className={cn('size-1.5 rounded-full', c.dot, status === 'LIVE' && 'animate-pulse')} />
      {c.label}
    </span>
  );
}

export function AudiencePill({
  audience,
  companyName,
}: {
  audience: LiveSessionAudience;
  companyName: string | null;
}) {
  if (audience === LiveSessionAudience.COMPANY) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
        <Building2 className="size-3" /> {companyName ?? 'Company'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
      <Globe2 className="size-3" /> All students
    </span>
  );
}
