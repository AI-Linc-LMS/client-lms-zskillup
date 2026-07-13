'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { getMySubscription } from '@/lib/api/payments';

/**
 * A slim upsell banner for free students. Renders nothing once the student holds
 * full-platform access (or while loading), so it never nags a paying user.
 */
export function UpgradeBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMySubscription()
      .then((s) => !cancelled && setShow(!s.hasPlatform))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!show) return null;

  return (
    <Link
      href="/upgrade"
      className="group relative mb-5 flex items-center gap-3 overflow-hidden rounded-2xl border border-[#f37021]/25 bg-gradient-to-r from-[#fff4ec] to-white p-4 transition-shadow hover:shadow-[0_12px_30px_-18px_rgba(243,112,33,0.6)]"
    >
      <span aria-hidden className="pointer-events-none absolute -right-6 -top-8 size-24 rounded-full bg-orange/10 blur-2xl" />
      <span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#f7a14e] to-[#f37021] text-white shadow-[0_10px_24px_-12px_rgba(243,112,33,0.9)]">
        <Sparkles className="size-5" />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="block text-sm font-extrabold text-navy">Unlock the full question bank</span>
        <span className="block text-xs text-slate-600">
          The first 5 questions of any topic are free - go full platform for unlimited access.
        </span>
      </span>
      <span className="relative inline-flex shrink-0 items-center gap-1.5 rounded-full bg-navy px-4 py-2 text-xs font-extrabold text-white">
        Upgrade <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
