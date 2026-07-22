'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowRight, ArrowUpRight, Check, ListChecks, ShoppingCart } from 'lucide-react';
import { useCartOptional } from '@/components/billing/CartProvider';
import {
  ACCENT_CLASS,
  DIFFICULTY_TONE,
  sectionDescriptorFor,
  sectionMetaFor,
  type Accent,
} from '@/components/practice/section-meta';
import type { SectionRoot } from '@/lib/sections/section-catalog';
import { BillingPeriod, EntitlementScope } from '@/shared/enums';
import { cn } from '@/lib/utils';

/** Accent → text colour, for the category eyebrow + "Explore now" link. */
const ACCENT_TEXT: Record<Accent, string> = {
  sky: 'text-sky-600',
  violet: 'text-violet-600',
  orange: 'text-orange-600',
  emerald: 'text-emerald-600',
  indigo: 'text-indigo-600',
  amber: 'text-amber-600',
};

/**
 * One Sectional Hub card - the section analog of `CompanyCard`, styled to match
 * the Sectional Hubs mockup: a category eyebrow + difficulty pill, an accent icon
 * tile, a two-stat strip (structural counts only - no raw question inventory, per
 * the student-facing counts rule) and an accent "Explore now" CTA. Owned sections
 * show "Owned"; otherwise a SECTION-scope "Add · ₹N" cart action.
 */
function SectionCartAction({
  section,
  owned,
  priceLabel,
}: {
  section: SectionRoot;
  owned?: boolean;
  priceLabel?: string | null;
}) {
  const cart = useCartOptional();

  if (owned) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200/70">
        <Check className="size-3" /> Owned
      </span>
    );
  }
  if (!cart) return null;

  const inCart = cart.has(EntitlementScope.SECTION, section.slug);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inCart) return;
    cart.add({
      scope: EntitlementScope.SECTION,
      scopeRef: section.slug,
      period: BillingPeriod.ANNUAL,
      label: section.name,
    });
    toast.success(`${section.name} added to cart`, {
      description: 'Unlocks every topic in this section. Change the plan length any time in your cart.',
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={inCart}
      aria-label={inCart ? `${section.name} is in your cart` : `Add ${section.name} to cart`}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold transition',
        inCart
          ? 'cursor-default bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/70'
          : 'bg-gradient-to-r from-[#ffd24d] via-[#ffc42d] to-[#f5b400] text-[#171717] shadow-sm hover:brightness-105',
      )}
    >
      {inCart ? (
        <>
          <Check className="size-3" /> In cart
        </>
      ) : (
        <>
          <ShoppingCart className="size-3" />
          {priceLabel ? `Add · ${priceLabel}` : 'Add to cart'}
        </>
      )}
    </button>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0">
      <p className="text-base font-extrabold leading-none tracking-tight text-navy tabular-nums">{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}

export function SectionCard({
  section,
  index,
  owned,
  priceLabel,
}: {
  section: SectionRoot;
  index: number;
  owned?: boolean;
  priceLabel?: string | null;
}) {
  const meta = sectionMetaFor(section.slug, index);
  const desc = sectionDescriptorFor(section.slug);
  const Icon = meta.icon;
  const tone = ACCENT_CLASS[meta.accent];
  const accentText = ACCENT_TEXT[meta.accent];
  // Structural counts only (no raw question inventory shown to students).
  const subCount = section.topics.reduce((n, t) => n + (t.subtopics.length || 1), 0);

  const cardClass =
    'relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_10px_34px_-20px_rgba(15,23,42,0.4)]';

  return (
    <motion.article
      whileHover={{ y: -8 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className="group relative h-full"
    >
      <Link
        href={`/dashboard/section/${section.slug}`}
        className={cn(
          cardClass,
          'transition-shadow duration-300 hover:shadow-[0_36px_70px_-30px_rgba(15,23,42,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40 focus-visible:ring-offset-2',
        )}
      >
        {/* accent top rail */}
        <span aria-hidden className={cn('absolute inset-x-0 top-0 h-[3px]', tone.solid)} />

        <div className="flex flex-1 flex-col p-5">
          {/* Header: icon tile + open affordance */}
          <div className="flex items-start justify-between">
            <span
              className={cn(
                'grid size-14 place-items-center rounded-2xl ring-1 ring-inset transition-transform duration-300 group-hover:scale-[1.04]',
                tone.tile,
              )}
            >
              <Icon className="size-7" aria-hidden="true" />
            </span>
            <span
              aria-hidden
              className="grid size-8 place-items-center rounded-full border border-slate-200/80 bg-white text-slate-500 transition-all duration-300 group-hover:border-transparent group-hover:bg-gradient-to-br group-hover:from-[#ffd24d] group-hover:to-[#f5b400] group-hover:text-[#171717] group-hover:shadow-[0_8px_20px_-8px_rgba(245,180,0,0.8)]"
            >
              <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-px group-hover:-translate-y-px" />
            </span>
          </div>

          {/* Badges: category eyebrow + difficulty */}
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className={cn('text-[11px] font-extrabold uppercase tracking-wider', accentText)}>
              {desc.category}
            </span>
            <span aria-hidden className="size-1 rounded-full bg-slate-300" />
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset',
                DIFFICULTY_TONE[desc.difficulty],
              )}
            >
              {desc.difficulty}
            </span>
          </div>

          <h3 className="mt-1.5 truncate text-lg font-extrabold leading-tight tracking-tight text-navy">
            {section.name}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-slate-600">{desc.tagline}</p>

          <div className="flex-1" />

          {/* Structural stat strip */}
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
            <Stat value={String(section.topicCount)} label="Topics" />
            <Stat value={String(subCount)} label="Sub-topics" />
          </div>

          {/* content indicator */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200/70">
              <ListChecks className="size-3 text-slate-500" aria-hidden="true" /> Practice · Study material
            </span>
          </div>

          {/* Footer CTA */}
          <div className="mt-4 flex items-center justify-between gap-2">
            <span className={cn('flex items-center gap-1 text-[13px] font-bold transition-colors group-hover:brightness-90', accentText)}>
              Explore now
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </span>
            <SectionCartAction section={section} owned={owned} priceLabel={priceLabel} />
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
