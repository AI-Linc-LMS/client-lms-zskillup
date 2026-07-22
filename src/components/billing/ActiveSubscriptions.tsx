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
 * section/platform → practice picker). Self-fetching - drop it on any page.
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
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-navy">
          <BadgeCheck className="size-4 text-emerald-500" /> Active subscriptions
        </h2>
        <Link href="/upgrade" className="text-xs font-semibold text-orange hover:underline">
          Manage
        </Link>
      </div>

      {ents.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-5 text-center">
          <p className="text-xs leading-relaxed text-slate-600">No active unlocks yet — the first 5 questions of anything are free.</p>
          <Link
            href="/shop"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-navy px-4 py-1.5 text-xs font-bold text-white transition hover:brightness-110"
          >
            Browse the shop <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {ents.map((e) => {
            const Icon = scopeIcon(e.scopeType);
            const link = practiceLinkForEntitlement(e.scopeType, e.scopeRef);
            return (
              <li key={e.id}>
                <Link
                  href={link.href}
                  title={link.cta}
                  className="group flex items-center gap-2.5 rounded-xl border border-slate-100 p-2.5 transition-colors hover:border-slate-200 hover:bg-slate-50"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#fff5ea] text-[#f5b400]">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-navy">
                      {entitlementLabel(e.scopeType, e.scopeRef)}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {e.daysRemaining != null ? `${e.daysRemaining} days left` : 'Lifetime access'}
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-slate-300 transition-colors group-hover:text-navy" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
