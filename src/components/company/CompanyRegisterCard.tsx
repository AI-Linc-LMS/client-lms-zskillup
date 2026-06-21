'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { BadgeCheck, CalendarCheck, Loader2, ShieldCheck, X } from 'lucide-react';
import { hasRoleHint } from '@/lib/session-hints';
import { ApiRequestError } from '@/lib/api/types';
import {
  cancelRegistration,
  getMyRegistrations,
  registerForCompany,
} from '@/lib/api/registrations';
import {
  getCompanyScheduledAssessments,
  type ApiScheduledAssessment,
} from '@/lib/api/scheduling';
import { AuroraBackground } from '@/components/motion/primitives';

type Phase = 'loading' | 'guest' | 'idle' | 'registered';

/**
 * "Register for this drive" card on the company hub (assessment lifecycle P1).
 * Shows a confirmation dialog, then a success state. Logged-out visitors (the
 * hub is public) get a sign-in prompt instead.
 */
export function CompanyRegisterCard({
  companySlug,
  companyName,
}: {
  companySlug: string;
  companyName: string;
}) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [dialog, setDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [justRegistered, setJustRegistered] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [nextAssessment, setNextAssessment] = useState<ApiScheduledAssessment | null>(null);
  // Portal target: only available after mount (avoids SSR/hydration mismatch).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    // Upcoming scheduled assessment for this company (public).
    getCompanyScheduledAssessments(companySlug)
      .then((rows) => {
        const upcoming = rows
          .filter((r) => new Date(r.scheduledAt).getTime() >= Date.now() - 86400000)
          .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt));
        setNextAssessment(upcoming[0] ?? null);
      })
      .catch(() => {});
  }, [companySlug]);

  useEffect(() => {
    if (!hasRoleHint()) {
      setPhase('guest');
      return;
    }
    let cancelled = false;
    getMyRegistrations()
      .then((rows) => {
        if (cancelled) return;
        const registered = rows.some(
          (r) => r.companySlug === companySlug && r.status !== 'CANCELLED',
        );
        setPhase(registered ? 'registered' : 'idle');
      })
      .catch(() => {
        if (!cancelled) setPhase('idle');
      });
    return () => {
      cancelled = true;
    };
  }, [companySlug]);

  const confirm = async () => {
    setSubmitting(true);
    setErr(null);
    try {
      await registerForCompany(companySlug);
      setDialog(false);
      setJustRegistered(true);
      setPhase('registered');
    } catch (e) {
      setErr(e instanceof ApiRequestError ? e.message : 'Could not register. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const unregister = async () => {
    setSubmitting(true);
    try {
      await cancelRegistration(companySlug);
      setPhase('idle');
      setJustRegistered(false);
    } catch {
      /* keep registered state on failure */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="relative isolate overflow-hidden rounded-3xl p-5 text-white shadow-[0_24px_60px_-30px_rgba(11,18,32,0.8)]">
        <AuroraBackground />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10"
        />
        <div className="relative z-10">
          <span className="flex size-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur">
            <CalendarCheck className="size-5 text-[#ffb877]" />
          </span>

          {phase === 'registered' ? (
            <>
              <p className="mt-3 flex items-center gap-1.5 text-sm font-bold text-emerald-300">
                <BadgeCheck className="size-4" /> You&apos;re registered
              </p>
              <p className="mt-1 text-xs leading-relaxed text-white/65">
                {justRegistered
                  ? `Registration successful — you're in for ${companyName}. Any scheduled assessment will appear on your calendar.`
                  : `You're registered for the ${companyName} drive. Watch your calendar for the assessment slot.`}
              </p>
              <button
                type="button"
                onClick={unregister}
                disabled={submitting}
                className="mt-4 w-full rounded-full border border-white/20 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white/80 transition-colors hover:bg-white/[0.12] disabled:opacity-50"
              >
                {submitting ? 'Cancelling…' : 'Cancel registration'}
              </button>
            </>
          ) : phase === 'guest' ? (
            <>
              <p className="mt-3 text-sm font-bold">Register for this drive</p>
              <p className="mt-1 text-xs leading-relaxed text-white/65">
                Sign in to register for the {companyName} drive and get your assessment scheduled.
              </p>
              <Link
                href={`/login?redirect=/dashboard/company/${companySlug}`}
                className="mt-4 block rounded-full bg-white px-3 py-2 text-center text-sm font-extrabold text-navy shadow-[0_8px_22px_-10px_rgba(0,0,0,0.5)]"
              >
                Log in to register
              </Link>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm font-bold">Register for this drive</p>
              <p className="mt-1 text-xs leading-relaxed text-white/65">
                Lock in your spot for the {companyName} hiring drive. We&apos;ll schedule your
                assessment and remind you before it starts.
              </p>
              <button
                type="button"
                onClick={() => setDialog(true)}
                disabled={phase === 'loading'}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#f7a14e] to-[#f37021] px-3 py-2 text-sm font-extrabold text-white shadow-[0_10px_24px_-10px_rgba(243,112,33,0.8)] transition-transform hover:scale-[1.02] disabled:opacity-60"
              >
                {phase === 'loading' ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>Register</>

                )}
              </button>
            </>
          )}

          {nextAssessment ? (
            <div className="mt-4 rounded-xl border border-white/15 bg-white/[0.06] p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#ffb877]">
                Next assessment
              </p>
              <p className="mt-1 text-xs font-semibold text-white">{nextAssessment.title}</p>
              <p className="mt-0.5 text-xs text-white/65">
                {new Date(nextAssessment.scheduledAt).toLocaleString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}{' '}
                · {nextAssessment.durationMinutes}m{nextAssessment.proctored ? ' · proctored' : ''}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {mounted
        ? createPortal(
            <AnimatePresence>
              {dialog ? (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                  <motion.button
                    type="button"
                    aria-label="Close"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => !submitting && setDialog(false)}
                    className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 16, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 16, scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                    className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
                  >
                    <button
                      type="button"
                      onClick={() => !submitting && setDialog(false)}
                      className="absolute right-4 top-4 grid size-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100"
                    >
                      <X className="size-4" />
                    </button>
                    <span className="grid size-12 place-items-center rounded-2xl bg-orange/10 text-orange">
                      <ShieldCheck className="size-6" />
                    </span>
                    <h3 className="mt-3 text-lg font-extrabold text-navy">
                      Confirm registration
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                      You&apos;re about to register for the <strong>{companyName}</strong> hiring drive.
                      Once registered, your assessment slot (when scheduled) will be blocked on your
                      calendar and you&apos;ll get reminders before it starts.
                    </p>
                    {err ? (
                      <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                        {err}
                      </p>
                    ) : null}
                    <div className="mt-5 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDialog(false)}
                        disabled={submitting}
                        className="flex-1 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={confirm}
                        disabled={submitting}
                        className="flex flex-[1.4] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#f7a14e] to-[#f37021] px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_10px_24px_-10px_rgba(243,112,33,0.8)] disabled:opacity-60"
                      >
                        {submitting ? <Loader2 className="size-4 animate-spin" /> : 'Confirm & register'}
                      </button>
                    </div>
                  </motion.div>
                </div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
