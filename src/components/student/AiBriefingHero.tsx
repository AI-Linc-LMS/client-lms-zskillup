'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Flame, Sparkles, Star, Target, Timer, Zap } from 'lucide-react';
import { getBriefing, type StudentBriefing } from '@/lib/api/personalization';
import { AuroraBackground } from '@/components/motion/primitives';

/**
 * The redesigned dashboard hero — a personalized, AI-written briefing over the
 * signature aurora backdrop. Reads GET /students/briefing (OpenAI-generated,
 * cached, regenerated on activity) and renders greeting → headline → focus
 * areas → next-best-action, with the live level/XP/streak.
 */
export function AiBriefingHero() {
  const [b, setB] = useState<StudentBriefing | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getBriefing()
      .then((data) => !cancelled && setB(data))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const nextPct =
    b && b.stats.xpForNextLevel > 0
      ? Math.min(100, Math.round((b.stats.xpIntoLevel / b.stats.xpForNextLevel) * 100))
      : 0;

  return (
    <section className="relative overflow-hidden rounded-3xl p-7 text-white shadow-[0_24px_70px_-30px_rgba(11,18,32,0.8)] sm:p-9">
      <AuroraBackground />

      <div className="relative z-10">
        {/* eyebrow */}
        <motion.div
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/75 backdrop-blur"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Sparkles className="size-3.5 text-[#ffb877]" />
          {b?.generatedByAi ? 'Your AI briefing' : 'Your briefing'}
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
          </span>
        </motion.div>

        {!b ? (
          failed ? (
            <p className="mt-6 text-white/70">Welcome back — ready to practice?</p>
          ) : (
            <HeroSkeleton />
          )
        ) : (
          <>
            <motion.h1
              className="mt-5 text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-[40px]"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.05 }}
            >
              {b.greeting}
            </motion.h1>
            <motion.p
              className="mt-3 max-w-2xl text-[17px] font-medium leading-relaxed text-white/85"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.12 }}
            >
              {b.headline}
            </motion.p>
            <motion.p
              className="mt-1.5 max-w-2xl text-sm leading-relaxed text-white/55"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {b.subline}
            </motion.p>

            {/* focus chips */}
            {b.focusAreas.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2.5">
                {b.focusAreas.map((f, i) => (
                  <motion.div
                    key={f.title}
                    className="group flex items-start gap-2.5 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur transition-colors hover:bg-white/[0.1]"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.28 + i * 0.08 }}
                  >
                    <Target className="mt-0.5 size-4 shrink-0 text-[#ffb877]" />
                    <span>
                      <span className="block text-sm font-bold">{f.title}</span>
                      <span className="block text-xs text-white/55">{f.detail}</span>
                    </span>
                  </motion.div>
                ))}
              </div>
            )}

            {/* CTA + live progress */}
            <motion.div
              className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Link
                href={b.nextAction.href}
                className="group inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-b from-[#f7a14e] to-[#f37021] px-6 py-3 text-sm font-extrabold text-white shadow-[0_12px_30px_-10px_rgba(243,112,33,0.8)] transition-transform active:scale-[0.98]"
              >
                {b.nextAction.kind === 'mock' ? (
                  <Timer className="size-4" />
                ) : (
                  <Zap className="size-4" />
                )}
                {b.nextAction.label}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>

              <div className="flex items-center gap-4">
                <div className="min-w-[8.5rem]">
                  <div className="mb-1 flex items-center justify-between text-[11px] font-semibold">
                    <span className="flex items-center gap-1 text-white/80">
                      <Star className="size-3 fill-amber-300 text-amber-300" /> Lvl {b.stats.level}
                    </span>
                    <span className="text-white/45 tabular-nums">{nextPct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-[#f7a14e] to-[#f37021]"
                      initial={{ width: 0 }}
                      animate={{ width: `${nextPct}%` }}
                      transition={{ duration: 1, delay: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-extrabold backdrop-blur">
                  <Flame
                    className={
                      b.stats.currentStreakDays > 0
                        ? 'size-4 fill-orange-500 text-orange-400'
                        : 'size-4 text-white/40'
                    }
                  />
                  <span className="tabular-nums">{b.stats.currentStreakDays}</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </section>
  );
}

function HeroSkeleton() {
  return (
    <div className="mt-5 animate-pulse space-y-3">
      <div className="h-9 w-2/3 rounded-lg bg-white/10" />
      <div className="h-5 w-1/2 rounded-lg bg-white/10" />
      <div className="flex gap-2.5 pt-3">
        <div className="h-14 w-40 rounded-2xl bg-white/10" />
        <div className="h-14 w-40 rounded-2xl bg-white/10" />
      </div>
    </div>
  );
}
