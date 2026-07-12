'use client';

import { useCallback, useState } from 'react';
import { useMySubscription } from './useMySubscription';

/**
 * "Is this student on a free plan, and should acting on paid content prompt an upgrade?"
 *
 * Two conditions, and BOTH must hold:
 *
 *  1. `paywallEnabled` — the server's PAYWALL_ENABLED switch. While it is off the whole
 *     paywall is dormant and every gate must fall OPEN. It is off in production today, so
 *     this gate ships inert and turns on with the flag, exactly like the rest of billing.
 *     Getting this backwards would wall every single user out of their recommendations.
 *
 *  2. `planStatus === 'none'` — no active entitlement of any kind. A student who has bought
 *     anything at all passes through here; the finer per-scope checks already happen on the
 *     destination pages (the adaptive paywall, the company hub). Re-deriving scope from an
 *     arbitrary recommendation href would be guesswork.
 *
 * Fails OPEN on error: `useMySubscription` yields paywallEnabled=false when it can't load,
 * so a flaky network shows content rather than a wall.
 */
export function useUpgradeGate() {
  const { loading, paywallEnabled, planStatus } = useMySubscription();
  const [feature, setFeature] = useState<string | null>(null);

  const gated = !loading && paywallEnabled && planStatus === 'none';

  /**
   * Use as a click handler on a gated CTA. Returns true if it swallowed the click (and
   * opened the modal), false if the student is entitled and the link should just work.
   */
  const guard = useCallback(
    (e: React.MouseEvent, what: string): boolean => {
      if (!gated) return false;
      e.preventDefault();
      e.stopPropagation();
      setFeature(what);
      return true;
    },
    [gated],
  );

  return {
    gated,
    /** The thing they tried to open; non-null while the upgrade modal is showing. */
    feature,
    guard,
    close: useCallback(() => setFeature(null), []),
  };
}
