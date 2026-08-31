'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/student/StatusPill';
import { UpgradeModal } from '@/components/billing/UpgradeModal';
import { useUpgradeGate } from '@/hooks/useUpgradeGate';
import { roleHint } from '@/lib/session-hints';
import {
  applyToJob,
  getMyApplication,
  getPublicJobQuestions,
  type JobApplicationDto,
} from '@/lib/api/jobs';
import { ApiRequestError } from '@/lib/api/types';
import { buildCartLink } from '@/lib/payments/cart-link';
import { APPLICATION_STATUS } from '@/lib/jobs/application-status';
import { ApplyDialog } from './ApplyDialog';
import { BillingPeriod, EntitlementScope } from '@/shared/enums';

/**
 * The Apply action on a public job page.
 *
 * The page itself is static (ISR), so everything that depends on WHO is looking has
 * to happen here, after mount. Three states, in order of what we know:
 *
 *   1. Logged out - a link to sign in, carrying ?redirect back to this job.
 *   2. Logged in, already applied - the status, with a sentence explaining it.
 *   3. Logged in, not applied - the Apply button.
 *
 * The upgrade prompt is shown for free students as a courtesy, NOT as the gate. The
 * server re-checks entitlement on every apply and answers 403 PAYWALL; that response
 * opens the same modal. This matters because `useUpgradeGate` deliberately fails
 * OPEN on a network error, so a student on a flaky connection sees the button - and
 * then gets a truthful answer from the server rather than a silent no-op.
 */
export function ApplyButton({
  slug,
  jobId,
  jobTitle,
}: {
  slug: string;
  jobId: string;
  jobTitle: string;
}) {
  const [role, setRole] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [application, setApplication] = useState<JobApplicationDto | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { gated, feature, close } = useUpgradeGate();
  const [paywalled, setPaywalled] = useState(false);
  const [composing, setComposing] = useState(false);
  // Whether the posting asks ANY question (required OR optional). Pre-fetched so a
  // posting with only OPTIONAL questions still opens the form — otherwise the empty
  // apply below would silently submit before the student ever saw the questions.
  const [hasQuestions, setHasQuestions] = useState(false);

  useEffect(() => {
    const hint = roleHint();
    setRole(hint);
    if (!hint) {
      setReady(true);
      return;
    }
    let alive = true;
    getMyApplication(slug)
      .then((a) => {
        if (alive) setApplication(a);
      })
      // Not knowing whether they applied is not a reason to hide the button: the
      // server is idempotent, so a duplicate apply returns the original row.
      .catch(() => undefined)
      .finally(() => {
        if (alive) setReady(true);
      });
    // A failed fetch leaves hasQuestions false, so we fall back to the empty-apply
    // probe — which still opens the form for REQUIRED questions via the server bounce.
    getPublicJobQuestions(slug)
      .then((q) => {
        if (alive) setHasQuestions(q.length > 0);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [slug]);

  const onApply = useCallback(async () => {
    if (gated) {
      setPaywalled(true);
      return;
    }
    // The posting asks something: open the form directly rather than firing an empty
    // apply first. The empty apply would SUBMIT a posting whose questions are all
    // optional (nothing required to bounce on), so the student would never see them.
    // The server still re-checks entitlement on the real submit inside the dialog.
    if (hasQuestions) {
      setComposing(true);
      return;
    }
    // Probe the gate BEFORE opening the form. Filling in five answers and only then
    // being told you need a plan is the worst order to learn it in.
    setSubmitting(true);
    setError(null);
    try {
      setApplication(await applyToJob(slug));
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'PAYWALL') {
        setPaywalled(true);
      } else if (err instanceof ApiRequestError && /answer/i.test(err.message)) {
        // The posting asks questions. Open the form rather than surfacing a validation
        // error for fields the student was never shown.
        setComposing(true);
      } else if (err instanceof ApiRequestError) {
        // The server's own words - "this role has closed", "the deadline has passed"
        // - are more useful than anything generic we could write here.
        setError(err.message);
      } else {
        setError('Could not send your application. Check your connection and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }, [gated, slug, hasQuestions]);

  // Server-rendered markup and first paint: a disabled placeholder of the same size,
  // so the layout does not jump when the real state arrives.
  if (!ready) {
    return (
      <div className="mt-9 h-11 w-40 animate-pulse rounded-full bg-slate-100" aria-hidden="true" />
    );
  }

  if (!role) {
    return (
      <div className="mt-9">
        <Button asChild size="lg">
          <Link href={`/login?redirect=${encodeURIComponent(`/jobs/${slug}`)}`}>
            Sign in to apply
          </Link>
        </Button>
        <p className="mt-2 text-xs text-slate-500">
          Applying takes one click once you are signed in - we send your ZSkillup profile.
        </p>
      </div>
    );
  }

  if (application) {
    const meta = APPLICATION_STATUS[application.status];
    return (
      <div className="mt-9 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="size-5 text-emerald-600" aria-hidden="true" />
          <p className="text-base font-bold text-navy">You applied to this role</p>
          <StatusPill tone={meta.tone} label={meta.label} />
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{meta.reason}</p>
        <Link
          href="/applications"
          className="mt-3 inline-block text-sm font-semibold text-navy hover:underline"
        >
          All my applications →
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-9">
      <Button size="lg" onClick={onApply} disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Sending…
          </>
        ) : (
          'Apply now'
        )}
      </Button>
      <p className="mt-2 text-xs text-slate-500">
        One click - we send your ZSkillup profile. You will get an email confirming it.
      </p>
      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200"
        >
          {error}
        </p>
      ) : null}

      {/* ONE way out, and it is the one that works. "Explore plans" led to the
          Full-Platform-vs-Build-your-own chooser, where a student could assemble a
          plan that still does not let them apply - a dead end wearing a CTA. The
          single button lands them on a cart already holding what the gate wants. */}
      {composing ? (
        <ApplyDialog
          slug={slug}
          jobId={jobId}
          jobTitle={jobTitle}
          onClose={() => setComposing(false)}
          onApplied={(a) => {
            setApplication(a);
            setComposing(false);
          }}
        />
      ) : null}

      <UpgradeModal
        open={paywalled || feature !== null}
        onClose={() => {
          setPaywalled(false);
          close();
        }}
        title="Applying needs an active plan"
        message={`Applying to ${jobTitle} needs Full Platform access. One month is enough - it is already in your cart.`}
        primaryHref={buildCartLink([
          { scope: EntitlementScope.PLATFORM, scopeRef: null, period: BillingPeriod.MONTHLY },
        ])}
        primaryLabel="Continue to cart"
        exploreHref={null}
      />
    </div>
  );
}
