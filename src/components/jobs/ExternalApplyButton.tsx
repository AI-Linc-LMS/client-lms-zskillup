'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UpgradeModal } from '@/components/billing/UpgradeModal';
import { apiClient } from '@/lib/api/client';
import { buildCartLink } from '@/lib/payments/cart-link';
import { roleHint } from '@/lib/session-hints';
import { safeHttpUrl } from '@/lib/utils';
import type { JobPostingDto } from '@/shared/dto/jobs.dto';
import { BillingPeriod, EntitlementScope } from '@/shared/enums';

/**
 * The Apply action for a posting whose employer collects applications on their OWN
 * site — the sibling of ApplyButton, and gated by the same plan.
 *
 * That link used to be an ordinary outbound button for everyone, including logged-out
 * visitors, while the jobs you apply to THROUGH the platform were paywalled. The gate
 * is now on the server: the job payload simply has no `applyUrl` for a viewer who has
 * not paid, and `applyUrlLocked` says that is why. This component only decides what to
 * render in its place — it can never be the control, and nothing it does can produce a
 * URL the API withheld.
 *
 * The page is public and ISR-rendered by an ANONYMOUS server fetch, so the snapshot is
 * always the locked one. Anything that depends on who is looking therefore has to
 * happen here, after mount — the same reason ApplyButton works this way:
 *
 *   1. locked + signed out    — sign in first, carrying ?redirect back to this job.
 *   2. locked + signed in     — re-ask as THEM; an entitled student gets the real link.
 *   3. not locked             — the outbound button, exactly as before.
 */
export function ExternalApplyButton({
  slug,
  companyName,
  jobTitle,
  applyUrl,
  locked,
}: {
  slug: string;
  companyName: string;
  jobTitle: string;
  /** The employer's link, already laundered through safeHttpUrl. Null when withheld. */
  applyUrl: string | null;
  /** The server withheld the link from THIS payload's viewer. */
  locked: boolean;
}) {
  const [href, setHref] = useState<string | null>(applyUrl);
  const [role, setRole] = useState<string | null>(null);
  // Stays false when the payload already carries the link: there is nothing to ask.
  const [resolving, setResolving] = useState(locked && applyUrl === null);
  const [paywalled, setPaywalled] = useState(false);

  useEffect(() => {
    if (!locked || applyUrl !== null) return;
    const hint = roleHint();
    setRole(hint);
    if (!hint) {
      // Nobody is signed in, so there is no second identity to try.
      setResolving(false);
      return;
    }
    let alive = true;
    apiClient
      .get<JobPostingDto>(`/api/v1/jobs/${slug}`)
      .then((r) => {
        if (alive) setHref(safeHttpUrl(r.data.applyUrl));
      })
      // A failed re-ask leaves the locked CTA up. The upgrade prompt is a dead end for
      // a student who has already paid, but it is a recoverable one — and it is the
      // only side to fail on, since the alternative is inventing a link we do not have.
      .catch(() => undefined)
      .finally(() => {
        if (alive) setResolving(false);
      });
    return () => {
      alive = false;
    };
  }, [locked, applyUrl, slug]);

  const note = (text: string) => (
    <p className="mt-2 text-xs leading-relaxed text-slate-500">{text}</p>
  );

  // First paint and the re-ask: a placeholder of the same size, so the rail does not
  // jump when the real state arrives.
  if (resolving) {
    return (
      <div className="mt-3 h-12 w-full animate-pulse rounded-full bg-slate-100" aria-hidden="true" />
    );
  }

  if (href) {
    return (
      <>
        <Button asChild size="lg" className="mt-3 w-full">
          <a href={href} target="_blank" rel="noopener noreferrer">
            Apply on the company site
          </a>
        </Button>
        {note(
          `${companyName} takes applications directly, so this one isn't tracked in your ZSkillup applications.`,
        )}
      </>
    );
  }

  if (!role) {
    return (
      <>
        <Button asChild size="lg" className="mt-3 w-full">
          <Link href={`/login?redirect=${encodeURIComponent(`/jobs/${slug}`)}`}>
            Sign in to apply
          </Link>
        </Button>
        {note(
          `${companyName} takes applications on their own site. Sign in with an active plan to open their application link.`,
        )}
      </>
    );
  }

  return (
    <>
      <Button size="lg" className="mt-3 w-full" onClick={() => setPaywalled(true)}>
        <Lock className="size-4" aria-hidden="true" /> Unlock the employer&rsquo;s link
      </Button>
      {note(
        `${companyName} takes applications on their own site. Their application link is part of the plan — everything else on this posting stays open.`,
      )}

      {/* The same ONE way out the in-portal Apply offers: a cart already holding what
          the gate wants, not a chooser where a student can assemble a plan that still
          does not unlock this. */}
      <UpgradeModal
        open={paywalled}
        onClose={() => setPaywalled(false)}
        title="Opening this employer's site needs an active plan"
        message={`${companyName} takes applications for ${jobTitle} on their own site. Full Platform access opens their application link. One month is enough - it is already in your cart.`}
        primaryHref={buildCartLink([
          { scope: EntitlementScope.PLATFORM, scopeRef: null, period: BillingPeriod.MONTHLY },
        ])}
        primaryLabel="Continue to cart"
        exploreHref={null}
      />
    </>
  );
}
