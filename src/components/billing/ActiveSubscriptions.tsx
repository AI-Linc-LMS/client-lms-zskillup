'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, Building2, Layers, Sparkles, Target } from 'lucide-react';
import { getMySubscription } from '@/lib/api/payments';
import { entitlementLabel, practiceLinkForEntitlement } from '@/lib/payments/entitlement-links';
import { EntitlementScope } from '@/shared/enums';
import type { EntitlementDto } from '@/shared/dto/payments.dto';

function scopeIcon(s: EntitlementScope) {
  if (s === EntitlementScope.PLATFORM) return Sparkles;
  if (s === EntitlementScope.SECTION) return Layers;
  if (s === EntitlementScope.COMPANY) return Building2;
  return Target;
}

/**
 * The student's active purchases, each linking straight into practice for what
 * they bought (topic → adaptive runner, company → hub, coding → workspace,
 * section/platform → practice picker). Self-fetching — drop it on any page.
 */
export function ActiveSubscriptions({ className }: { className?: string }) {
  const [ents, setEnts] = useState<EntitlementDto[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMySubscription()
      .then((s) => {
        if (!cancelled) setEnts((s.entitlements ?? []).filter((e) => e.status === 'ACTIVE'));
      })
      .catch(() => {
        if (!cancelled) setEnts([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (ents === null) return null; // stay quiet while loading

  return (
    <section className={className}>
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-400">
          <BadgeCheck className="size-4 text-emerald-500" /> Active subscriptions
        </h2>
        <Link href="/upgrade" className="text-xs font-bold text-orange hover:underline">
          Manage →
        </Link>
      </div>

      {ents.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center">
          <p className="text-sm text-slate-500">No active unlocks yet - you get the first 5 questions of anything free.</p>
          <Link
            href="/shop"
            className="mt-3 inline-block rounded-full bg-navy px-4 py-1.5 text-xs font-bold text-white"
          >
            Browse the shop
          </Link>
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {ents.map((e) => {
            const Icon = scopeIcon(e.scopeType);
            const link = practiceLinkForEntitlement(e.scopeType, e.scopeRef);
            return (
              <li
                key={e.id}
                className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition hover:border-slate-200"
              >
                <div className="flex items-center gap-2.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-orange/10 text-orange">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-navy">
                      {entitlementLabel(e.scopeType, e.scopeRef)}
                    </span>
                    <span className="text-xs text-slate-500">
                      {e.daysRemaining != null ? `${e.daysRemaining} days left` : 'Lifetime access'}
                    </span>
                  </span>
                </div>
                <Link
                  href={link.href}
                  className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-full bg-navy px-3 py-2 text-xs font-bold text-white transition hover:brightness-110"
                >
                  {link.cta} <ArrowRight className="size-3.5" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
