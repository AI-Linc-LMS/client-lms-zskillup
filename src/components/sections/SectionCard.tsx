'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowRight, ArrowUpRight, Check, Layers, ListChecks, ShoppingCart } from 'lucide-react';
import { useCartOptional } from '@/components/billing/CartProvider';
import { ACCENT_CLASS, sectionMetaFor } from '@/components/practice/section-meta';
import type { SectionRoot } from '@/lib/sections/section-catalog';
import { BillingPeriod, EntitlementScope } from '@/shared/enums';
import { cn } from '@/lib/utils';

/**
 * One Sectional Hub card — the section analog of `CompanyCard`. Instead of a logo
 * banner it shows the section's icon tile + accent (from `section-meta.ts`), the
 * topic count (a structural number, NOT a raw question tally), and an "Add · ₹N"
 * SECTION-scope cart action. Owned sections (Full Platform or a section grant)
 * show "Owned" instead.
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
  const Icon = meta.icon;
  const tone = ACCENT_CLASS[meta.accent];

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
        {/* Icon banner — mirrors the company logo banner, keyed to the section accent. */}
        <div className="relative flex h-36 items-center justify-center border-b border-slate-100 bg-gradient-to-br from-slate-50/90 via-white to-slate-50/50 px-8">
          <span aria-hidden className={cn('absolute inset-x-0 top-0 h-[3px]', tone.solid)} />
          <span
            aria-hidden
            className="absolute right-4 top-4 grid size-8 place-items-center rounded-full border border-slate-200/80 bg-white text-slate-500 transition-all duration-300 group-hover:border-transparent group-hover:bg-gradient-to-br group-hover:from-[#ffd24d] group-hover:to-[#f5b400] group-hover:text-[#171717] group-hover:shadow-[0_8px_20px_-8px_rgba(245,180,0,0.8)]"
          >
            <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-px group-hover:-translate-y-px" />
          </span>
          <span
            className={cn(
              'grid size-20 place-items-center rounded-2xl text-2xl font-extrabold shadow-[0_14px_30px_-12px_rgba(15,23,42,0.35)] ring-1 ring-inset transition-transform duration-300 group-hover:scale-[1.05]',
              tone.tile,
            )}
          >
            <Icon className="size-9" aria-hidden="true" />
          </span>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col p-5">
          <h3 className="truncate text-lg font-extrabold leading-tight tracking-tight text-navy">
            {section.name}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-slate-600">
            Master this section end to end — guided syllabus, study material and topic-wise practice
            from the real question bank.
          </p>

          {section.topicCount > 0 ? (
            <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 ring-1 ring-inset ring-slate-200/70">
              <Layers className="size-3 text-slate-500" aria-hidden="true" />
              {section.topicCount} {section.topicCount === 1 ? 'topic' : 'topics'}
            </span>
          ) : null}

          <div className="flex-1" />

          <div className="mt-5 flex flex-wrap gap-1.5 border-t border-slate-100 pt-4">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200/70">
              <ListChecks className="size-3 text-slate-500" aria-hidden="true" /> Practice Qs
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1 text-[13px] font-bold text-orange transition-colors group-hover:text-[#d9610f]">
              Open section
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </span>
            <SectionCartAction section={section} owned={owned} priceLabel={priceLabel} />
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
