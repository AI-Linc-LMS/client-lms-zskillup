'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, ClipboardList, Code2, History } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Card display shape — accepts either a live API company (most fields nullable)
 * or a fully-hydrated demo company. The footer surfaces REAL counts from the
 * question/coding banks (questionCount/pyqCount/codingCount) and renders the
 * real company logo when available (monogram fallback on missing/broken image).
 */
export interface CompanyCardData {
  slug: string;
  name: string;
  tagline: string | null;
  accent: string | null;
  badge?: string | null;
  difficulty?: string;
  logoUrl?: string | null;
  rounds?: number;
  questionCount?: number;
  pyqCount?: number;
  codingCount?: number;
}

/** Two-letter monogram from the company name (e.g. "TCS" → "TC", "Capgemini" → "Ca"). */
function monogramOf(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

/** Compact integer formatting: 1240 → "1.2k", 320 → "320". */
function compact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k`;
  return String(n);
}

/** Difficulty → tonal pill classes (emerald / amber / red). */
const DIFFICULTY_TONE: Record<string, string> = {
  Easy: 'bg-emerald-50 text-emerald-700 ring-emerald-200/70',
  Medium: 'bg-amber-50 text-amber-700 ring-amber-200/70',
  Hard: 'bg-red-50 text-red-700 ring-red-200/70',
};

/** A single company card. One template, many instances (DEMO + live API). */
export function CompanyCard({ company }: { company: CompanyCardData }) {
  const accent = company.accent ?? 'from-slate-700 to-slate-900';
  const monogram = monogramOf(company.name);
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = Boolean(company.logoUrl) && !logoFailed;
  const difficultyTone =
    (company.difficulty && DIFFICULTY_TONE[company.difficulty]) ??
    'bg-slate-50 text-slate-600 ring-slate-200/70';

  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className="group relative h-full"
    >
      <Link
        href={`/dashboard/company/${company.slug}`}
        className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_-18px_rgba(15,23,42,0.35)] transition-shadow duration-300 hover:shadow-[0_28px_60px_-26px_rgba(15,23,42,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40 focus-visible:ring-offset-2"
      >
        {/* faint gradient wash for depth */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-50/80 via-transparent to-transparent"
        />
        {/* colored glow blob — keyed to the company accent, intensifies on hover */}
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute -right-12 -top-14 size-36 rounded-full bg-gradient-to-br opacity-[0.12] blur-2xl transition-opacity duration-500 group-hover:opacity-30',
            accent,
          )}
        />
        {/* top-edge highlight */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-slate-300/60 to-transparent"
        />

        <div className="relative z-10 flex flex-1 flex-col">
          {/* header — monogram tile + name/tagline */}
          <div className="flex items-start gap-3.5">
            {showLogo ? (
              <span className="relative grid h-14 w-[4.75rem] shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200/80 bg-white px-2.5 py-2 shadow-[0_10px_24px_-12px_rgba(15,23,42,0.35)] transition-transform duration-300 group-hover:scale-[1.04]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={company.logoUrl as string}
                  alt={`${company.name} logo`}
                  className="max-h-9 max-w-full object-contain"
                  loading="lazy"
                  onError={() => setLogoFailed(true)}
                />
              </span>
            ) : (
              <span
                className={cn(
                  'relative grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-lg font-extrabold text-white shadow-[0_10px_24px_-10px_rgba(15,23,42,0.55)] ring-1 ring-inset ring-white/25 transition-transform duration-300 group-hover:scale-[1.06]',
                  accent,
                )}
              >
                <span aria-hidden className="absolute inset-x-2 top-0 h-px bg-white/40" />
                {monogram}
              </span>
            )}

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-extrabold leading-tight tracking-tight text-navy">
                {company.name}
              </h3>
              {company.tagline ? (
                <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-slate-500">
                  {company.tagline}
                </p>
              ) : null}
            </div>

            {/* hover arrow affordance */}
            <span
              aria-hidden
              className="grid size-8 shrink-0 -translate-y-0.5 place-items-center rounded-full border border-slate-200/80 bg-white text-slate-400 transition-all duration-300 group-hover:border-transparent group-hover:bg-gradient-to-br group-hover:from-[#f7a14e] group-hover:to-[#f37021] group-hover:text-white group-hover:shadow-[0_8px_20px_-8px_rgba(243,112,33,0.8)]"
            >
              <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-px group-hover:-translate-y-px" />
            </span>
          </div>

          {/* chips — badge + difficulty + question bank */}
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {company.badge ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#fff1e6] to-[#ffe6cf] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#c2540f] ring-1 ring-inset ring-orange/20">
                {company.badge}
              </span>
            ) : null}
            {company.difficulty ? (
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset',
                  difficultyTone,
                )}
              >
                {company.difficulty}
              </span>
            ) : null}
            {company.rounds ? (
              <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 ring-1 ring-inset ring-slate-200/70">
                {company.rounds} rounds
              </span>
            ) : null}
          </div>

          {/* spacer pushes the stat footer to the bottom for even card heights */}
          <div className="flex-1" />

          {/* stat footer — REAL bank counts (live from the question/coding banks) */}
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
            <div className="flex flex-col">
              <span className="flex items-center gap-1 text-[15px] font-extrabold leading-none tabular-nums text-navy">
                <ClipboardList className="size-3.5 text-slate-400" aria-hidden="true" />
                {compact(company.questionCount ?? 0)}
              </span>
              <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Questions
              </span>
            </div>
            <div className="flex flex-col border-l border-slate-100 pl-2">
              <span className="flex items-center gap-1 text-[15px] font-extrabold leading-none tabular-nums text-navy">
                <History className="size-3.5 text-orange" aria-hidden="true" />
                {compact(company.pyqCount ?? 0)}
              </span>
              <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                PYQs
              </span>
            </div>
            <div className="flex flex-col border-l border-slate-100 pl-2">
              <span className="flex items-center gap-1 text-[15px] font-extrabold leading-none tabular-nums text-emerald-600">
                <Code2 className="size-3.5 text-emerald-500" aria-hidden="true" />
                {compact(company.codingCount ?? 0)}
              </span>
              <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Coding
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
