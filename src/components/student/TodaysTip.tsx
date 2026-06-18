'use client';

import { type ComponentType, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Building2,
  Flame,
  Lightbulb,
  type LucideProps,
  Moon,
  Rocket,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { getTodaysTip, type ApiTip } from '@/lib/api/tips';

/** Map the admin-authored icon name to a lucide component (fallback: Lightbulb). */
const ICONS: Record<string, ComponentType<LucideProps>> = {
  Lightbulb,
  Flame,
  Timer,
  Target,
  Zap,
  Building2,
  TrendingUp,
  Moon,
  Sparkles,
  Rocket,
};

/**
 * Today's Tip — a small, warm dashboard card with an admin-authored placement
 * tip, rotated per student per day (GET /students/today-tip). Aurora styling:
 * amber-tinted glass over a faint glow, with an optional CTA.
 */
export function TodaysTip() {
  const [tip, setTip] = useState<ApiTip | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getTodaysTip()
      .then((t) => !cancelled && setTip(t))
      .catch(() => {})
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (loaded && !tip) return null; // nothing to show — stay out of the way

  const Icon = (tip?.icon && ICONS[tip.icon]) || Lightbulb;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5 }}
      className="group relative overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-amber-300/25 blur-2xl transition-opacity group-hover:opacity-80"
      />
      {!tip ? (
        <div className="flex animate-pulse items-start gap-3">
          <div className="size-10 rounded-xl bg-amber-200/60" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3 w-24 rounded bg-amber-200/60" />
            <div className="h-4 w-3/4 rounded bg-amber-100" />
            <div className="h-3 w-full rounded bg-amber-100" />
          </div>
        </div>
      ) : (
        <div className="relative flex items-start gap-3.5">
          <motion.span
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_8px_20px_-8px_rgba(245,158,11,0.8)]"
            animate={{ rotate: [0, -8, 8, 0] }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <Icon className="size-5" />
          </motion.span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-600">
              <Sparkles className="size-3" /> Today&apos;s tip
              {tip.category ? <span className="text-amber-400">· {tip.category}</span> : null}
            </p>
            <h3 className="mt-1 text-[15px] font-extrabold leading-snug text-navy">{tip.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{tip.body}</p>
            {tip.ctaLabel && tip.ctaHref ? (
              <Link
                href={tip.ctaHref}
                className="mt-2.5 inline-flex items-center gap-1 text-sm font-bold text-orange-600 transition-colors hover:text-orange-700"
              >
                {tip.ctaLabel}
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ) : null}
          </div>
        </div>
      )}
    </motion.section>
  );
}
