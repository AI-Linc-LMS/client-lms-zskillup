'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarCheck, Crown, Loader2, PlayCircle } from 'lucide-react';
import { hasRoleHint } from '@/lib/session-hints';
import { getCompanyScheduledAssessments, type ApiScheduledAssessment } from '@/lib/api/scheduling';
import { useMySubscription } from '@/hooks/useMySubscription';
import { EntitlementScope } from '@/shared/enums';
import { AuroraBackground } from '@/components/motion/primitives';

/**
 * Assessment-access card on the company hub. The company-registration step was
 * removed (#34/#39): instead of asking students to "register", the card reflects
 * their actual access. Eligible students (own this hub or Full Platform) get a
 * "Start Assessment" CTA - direct when the assessment window is open, or the
 * assessment details when it's still scheduled; students without access get an
 * "Upgrade" CTA. Logged-out visitors get a sign-in prompt.
 */
export function CompanyRegisterCard({
  companySlug,
  companyName,
}: {
  companySlug: string;
  companyName: string;
}) {
  const { hasPlatform, active, loading: subLoading } = useMySubscription();
  const owned =
    hasPlatform ||
    active.some((e) => e.scopeType === EntitlementScope.COMPANY && e.scopeRef === companySlug);

  const [next, setNext] = useState<ApiScheduledAssessment | null>(null);
  const [loaded, setLoaded] = useState(false);
  const signedIn = hasRoleHint();

  useEffect(() => {
    // The company's active scheduled assessments are public - no registration needed
    // to see (or, for entitled students, to start) them. Pick the soonest that hasn't
    // finished yet.
    getCompanyScheduledAssessments(companySlug)
      .then((rows) => {
        const upcoming = rows
          .filter((r) => r.isActive)
          .filter((r) => new Date(r.scheduledAt).getTime() + r.durationMinutes * 60_000 >= Date.now())
          .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt));
        setNext(upcoming[0] ?? null);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [companySlug]);

  const loading = subLoading || !loaded;

  // Assessment window state (only meaningful once `next` is loaded).
  const now = Date.now();
  const startAt = next ? new Date(next.scheduledAt).getTime() : 0;
  const endAt = next ? startAt + next.durationMinutes * 60_000 : 0;
  const isLive = next ? now >= startAt && now <= endAt : false;
  const startHref =
    next && next.mockTestId
      ? `/dashboard/quiz?mock=${next.mockTestId}&assessment=${next.id}${next.proctored ? '&proctored=1' : ''}`
      : null;

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

  return (
    <div className="relative isolate overflow-hidden rounded-3xl p-5 text-white shadow-[0_24px_60px_-30px_rgba(11,18,32,0.8)]">
      <AuroraBackground />
      <div aria-hidden className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10" />
      <div className="relative z-10">
        <span className="flex size-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur">
          <CalendarCheck className="size-5 text-[#ffc42d]" />
        </span>

        {loading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-white/70">
            <Loader2 className="size-4 animate-spin" /> Checking your access…
          </div>
        ) : !signedIn ? (
          <>
            <p className="mt-3 text-sm font-bold">{companyName} assessment</p>
            <p className="mt-1 text-xs leading-relaxed text-white/65">
              Sign in to take the {companyName} assessment.
            </p>
            <Link
              href={`/login?redirect=/dashboard/company/${companySlug}`}
              className="mt-4 block rounded-full bg-white px-3 py-2 text-center text-sm font-extrabold text-navy shadow-[0_8px_22px_-10px_rgba(0,0,0,0.5)]"
            >
              Log in to continue
            </Link>
          </>
        ) : !owned ? (
          <>
            <p className="mt-3 text-sm font-bold">Unlock the {companyName} assessment</p>
            <p className="mt-1 text-xs leading-relaxed text-white/65">
              Get the {companyName} hub (or Full Platform) to take its proctored assessment and practice its pattern.
            </p>
            <Link
              href="/upgrade"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ffd24d] to-[#f5b400] px-3 py-2 text-sm font-extrabold text-[#171717] shadow-[0_10px_24px_-10px_rgba(245,180,0,0.8)] transition-transform hover:scale-[1.02]"
            >
              <Crown className="size-4" /> Upgrade to unlock
            </Link>
          </>
        ) : next ? (
          <>
            <p className="mt-3 flex items-center gap-1.5 text-sm font-bold text-emerald-300">
              <CalendarCheck className="size-4" /> {isLive ? 'Assessment is live' : 'Assessment scheduled'}
            </p>
            <div className="mt-3 rounded-xl border border-white/15 bg-white/[0.06] p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#ffc42d]">
                {isLive ? 'Live now' : 'Next assessment'}
              </p>
              <p className="mt-1 text-xs font-semibold text-white">{next.title}</p>
              <p className="mt-0.5 text-xs text-white/65">
                {fmt(next.scheduledAt)} · {next.durationMinutes}m{next.proctored ? ' · proctored' : ''}
              </p>
            </div>
            {isLive && startHref ? (
              <Link
                href={startHref}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ffd24d] to-[#f5b400] px-3 py-2 text-sm font-extrabold text-[#171717] shadow-[0_10px_24px_-10px_rgba(245,180,0,0.8)] transition-transform hover:scale-[1.02]"
              >
                <PlayCircle className="size-4" /> Start Assessment
              </Link>
            ) : (
              <Link
                href="/assessments"
                className="mt-4 block rounded-full border border-white/20 bg-white/[0.06] px-3 py-2 text-center text-sm font-semibold text-white/85 transition-colors hover:bg-white/[0.12]"
              >
                View assessment details
              </Link>
            )}
          </>
        ) : (
          <>
            <p className="mt-3 text-sm font-bold">You&apos;re all set for {companyName}</p>
            <p className="mt-1 text-xs leading-relaxed text-white/65">
              No assessment is scheduled right now. When one is, it&apos;ll appear here and on your calendar - ready to start.
            </p>
            <Link
              href="/assessments"
              className="mt-4 block rounded-full border border-white/20 bg-white/[0.06] px-3 py-2 text-center text-sm font-semibold text-white/85 transition-colors hover:bg-white/[0.12]"
            >
              View my assessments
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
