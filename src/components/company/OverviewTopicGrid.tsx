'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { History, Loader2, Target } from 'lucide-react';
import { getCompanyPrep, type ApiCompanyPrep } from '@/lib/api/catalog';

/**
 * Dynamic, clickable topic grid for a company hub. Topics come from the live
 * question bank (GET /companies/:slug/prep). Tapping a topic opens that
 * company's previous-year questions for it.
 */
export function OverviewTopicGrid({ slug }: { slug: string }) {
  const [prep, setPrep] = useState<ApiCompanyPrep | null>(null);

  useEffect(() => {
    getCompanyPrep(slug).then(setPrep).catch(() => setPrep({ topics: [], years: [], roles: [], totals: { total: 0, verified: 0, pyq: 0 } }));
  }, [slug]);

  if (!prep) {
    return <div className="grid h-28 place-items-center rounded-2xl border border-slate-200 bg-white"><Loader2 className="size-5 animate-spin text-slate-400" /></div>;
  }
  const topics = [...prep.topics].sort((a, b) => b.count - a.count);
  if (topics.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        Topics appear here as the question bank fills for this company.
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-1 flex items-center gap-2 text-lg font-extrabold tracking-tight text-navy">
        <Target className="size-4 text-orange" aria-hidden="true" /> Topics &amp; previous-year questions
      </h3>
      <p className="mb-3 text-sm text-slate-500">Tap a topic to see this company&apos;s previous-year questions for it.</p>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((t, i) => (
          <motion.div
            key={t.slug}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.4) }}
          >
            <Link
              href={`/dashboard/company/${slug}/pyqs/${t.slug}`}
              className="group flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white px-3.5 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange/40 hover:shadow-md"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-navy group-hover:text-orange">{t.name}</span>
                <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                  <History className="size-3 text-orange" /> {t.count} question{t.count === 1 ? '' : 's'}
                </span>
              </span>
              <span className="grid size-7 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-400 transition-colors group-hover:border-orange group-hover:bg-orange group-hover:text-white">
                →
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
