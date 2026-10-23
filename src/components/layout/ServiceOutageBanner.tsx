'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

/** How often to re-check once we believe we are down. */
const RETRY_MS = 30_000;
/**
 * A public, unauthenticated read that needs the API to be alive.
 *
 * ABSOLUTE, AGAINST THE API ORIGIN — NOT A RELATIVE PATH. A relative URL resolves
 * against the page, which is served by Next; that host is up by definition whenever
 * this component is running, so the probe would answer 404 from the web tier and the
 * banner could never fire during the exact outage it exists for. The frontend and the
 * API are deployed separately, which is the whole premise of this banner, so the probe
 * has to cross that boundary too.
 */
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');
const PROBE = `${API_BASE}/api/v1/colleges?limit=1`;

/**
 * SAYS "WE ARE DOWN" WHEN THE API IS DOWN — AND GETS OUT OF THE WAY WHEN IT IS NOT.
 *
 * The frontend is hosted separately from the API, so an API outage leaves the site
 * loading perfectly while nothing inside it works: a student signs in and gets a
 * spinner, or a blank dashboard, and concludes the product is broken rather than
 * briefly unavailable. That is the worst failure mode available to us — it costs
 * trust in a way an honest "back shortly" does not.
 *
 * It probes rather than being switched on, so nobody has to remember to take it down:
 * the banner clears itself the moment the API answers again. A 502/503/504 is the
 * signal — those come from the edge when there is nothing healthy behind it. A 401 or
 * a 404 means the API is alive and talking, so the banner stays away.
 */
export function ServiceOutageBanner() {
  const [down, setDown] = useState(false);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const probe = async () => {
      let isDown = false;
      try {
        const res = await fetch(PROBE, { cache: 'no-store' });
        // Only a gateway-level failure counts. Any real HTTP answer — including 401
        // or 404 — means the API is up and this banner has no business showing.
        isDown = res.status === 502 || res.status === 503 || res.status === 504;
      } catch {
        // A network error here is just as likely to be the viewer's own connection,
        // so it is not treated as an outage: a false "we are down" is its own damage.
        isDown = false;
      }
      // With no API origin configured there is nothing meaningful to probe, and a
      // same-origin 404 from the web tier would otherwise read as "healthy" forever.
      if (!API_BASE) isDown = false;
      if (!alive) return;
      setDown(isDown);
      // Keep checking while down, so recovery needs no deploy and no human.
      if (isDown) timer = setTimeout(() => void probe(), RETRY_MS);
    };

    void probe();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!down) return null;

  return (
    <div
      role="status"
      className="flex items-start gap-2.5 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p className="leading-relaxed">
        <span className="font-semibold">prephasz is temporarily unavailable.</span> We are
        working on it — your progress, attempts and purchases are safe. Please try again
        shortly.
      </p>
    </div>
  );
}
