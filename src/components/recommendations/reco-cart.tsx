'use client';

import Link from 'next/link';
import { ArrowRight, Building2, Check, Layers, Plus, Sparkles, Target } from 'lucide-react';
import { BillingPeriod, EntitlementScope } from '@/shared/enums';
import { useCartOptional } from '@/components/billing/CartProvider';
import type { RecommendationDto } from '@/lib/api/recommendations';
import { cn } from '@/lib/utils';

/**
 * Shared UI for turning a recommendation into either an ADD-TO-CART action (when
 * the reco maps to a purchasable product - `addable`) or a navigate CTA (nudges
 * like assessments / leaderboard). Reused by the top-bar "Recommended for you"
 * dropdown and the dashboard widget so the cart wiring lives in one place.
 */

/** "section-1-numerical-ability" → "Numerical Ability"; "coding:arrays" → "Arrays". */
export function prettySlug(ref: string | null): string {
  if (!ref) return '';
  return ref
    .replace(/^coding:/, '')
    .replace(/^section-\d+-/, '')
    .split(/[-:]/)
    .filter(Boolean)
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

/** Human label for the cart line a recommendation adds. */
export function recoLabel(r: RecommendationDto): string {
  if (r.scope === EntitlementScope.PLATFORM) return 'Full platform';
  if (r.scope === EntitlementScope.SECTION) return `${prettySlug(r.scopeRef)} section`;
  return prettySlug(r.scopeRef) || r.product;
}

const SCOPE_META: Partial<Record<EntitlementScope, { label: string; icon: typeof Building2 }>> = {
  [EntitlementScope.COMPANY]: { label: 'Company', icon: Building2 },
  [EntitlementScope.SECTION]: { label: 'Section', icon: Layers },
  [EntitlementScope.TOPIC]: { label: 'Topic', icon: Target },
  [EntitlementScope.PLATFORM]: { label: 'Full platform', icon: Sparkles },
};

/** The "why / what" chip - scope (Company/Section/Topic/Platform) + target name. */
export function RecoScopeChip({ r, className }: { r: RecommendationDto; className?: string }) {
  const meta = r.scope ? SCOPE_META[r.scope] : undefined;
  const Icon = meta?.icon ?? Sparkles;
  const target =
    r.scope && r.scope !== EntitlementScope.PLATFORM && r.scopeRef ? prettySlug(r.scopeRef) : null;
  const label = meta ? (target ? `${meta.label} · ${target}` : meta.label) : r.category;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-orange/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#c2540f]',
        className,
      )}
    >
      <Icon className="size-3" aria-hidden /> {label}
    </span>
  );
}

/** Add-to-cart (addable) or navigate (nudge) action for one recommendation. */
export function RecoAction({ r, block = false }: { r: RecommendationDto; block?: boolean }) {
  const cart = useCartOptional();
  const scope = r.scope;
  const addable = r.addable && !!scope;
  const inCart = !!(addable && scope && cart?.has(scope, r.scopeRef));

  const base = (extra: string) =>
    cn(
      'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full text-xs font-bold transition',
      block && 'w-full',
      extra,
    );

  if (!addable || !scope) {
    return (
      <Link href={r.href} className={base('px-3 py-1.5 text-orange hover:text-[#d9610f]')}>
        {r.cta} <ArrowRight className="size-3.5" />
      </Link>
    );
  }
  if (inCart) {
    return (
      <Link
        href="/cart"
        className={base('bg-emerald-50 px-3 py-1.5 text-emerald-700 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100')}
      >
        <Check className="size-3.5" /> In cart
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={() =>
        cart?.add({ scope, scopeRef: r.scopeRef, period: BillingPeriod.ANNUAL, label: recoLabel(r) })
      }
      className={base('bg-gradient-to-r from-[#ffd24d] to-[#f5b400] px-3 py-1.5 text-[#171717] shadow-sm hover:brightness-105')}
    >
      <Plus className="size-3.5" /> Add to cart
    </button>
  );
}
