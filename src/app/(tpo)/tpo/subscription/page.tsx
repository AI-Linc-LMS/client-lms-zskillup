'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarClock, CreditCard, Loader2, Users } from 'lucide-react';
import { getTpoSubscription } from '@/lib/api/tpo';
import type { CollegeSubscriptionDto } from '@/shared';
import { Button } from '@/components/ui/button';
import { ProvenanceChip } from '@/components/tpo/ui';

function fmtDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  TRIAL: 'bg-amber-100 text-amber-700',
  EXPIRED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
  SUSPENDED: 'bg-red-100 text-red-700',
};

export default function SubscriptionPage() {
  const [sub, setSub] = useState<CollegeSubscriptionDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTpoSubscription()
      .then(setSub)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load subscription'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-7 animate-spin text-slate-400" />
      </div>
    );
  }
  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>;
  }
  if (!sub) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#fff5ea] text-[#f5b400]">
          <CreditCard className="size-6" />
        </span>
        <h2 className="mt-4 text-lg font-extrabold text-navy">No active subscription</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
          Your college doesn&apos;t have an active plan yet. Explore Cohort Access to unlock company
          question banks for your students.
        </p>
        <Button asChild className="mt-4">
          <Link href="/tpo/billing">Browse Cohort Access</Link>
        </Button>
      </div>
    );
  }

  const seatPct = sub.seatLimit > 0 ? Math.min(100, Math.round((sub.seatsUsed / sub.seatLimit) * 100)) : 0;

  return (
    <div className="space-y-6">
      {/* Plan hero */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1f2d4d] via-[#16223f] to-[#0b1220] p-6 text-white sm:p-8">
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[#ffc42d]/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">Current plan</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">{sub.planName}</h1>
            <div className="mt-2 flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_STYLE[sub.status] ?? 'bg-white/10 text-white'}`}>
                {sub.status}
              </span>
              {sub.isTrial && <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-200">Trial</span>}
            </div>
          </div>
          <Button asChild variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
            <Link href="/tpo/billing">Manage access</Link>
          </Button>
        </div>
      </section>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            <Users className="size-3.5" /> Seats
          </span>
          <p className="mt-2 text-2xl font-black tabular-nums text-navy">
            {sub.seatsUsed.toLocaleString('en-IN')}{' '}
            <span className="text-base font-semibold text-slate-400">/ {sub.seatLimit.toLocaleString('en-IN')}</span>
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${seatPct >= 90 ? 'bg-red-500' : 'bg-navy'}`} style={{ width: `${seatPct}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">{seatPct}% of seats used</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            <CalendarClock className="size-3.5" /> Validity
          </span>
          <p className="mt-2 text-sm font-bold text-navy">{fmtDate(sub.startsAt)}</p>
          <p className="text-xs text-slate-400">to {sub.expiresAt ? fmtDate(sub.expiresAt) : 'no expiry'}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            <CreditCard className="size-3.5" /> College
          </span>
          <p className="mt-2 text-sm font-bold text-navy">{sub.collegeName ?? '—'}</p>
          <p className="text-xs text-slate-400">Since {fmtDate(sub.createdAt)}</p>
        </div>
      </div>

      <ProvenanceChip source="College subscription record" />
    </div>
  );
}
