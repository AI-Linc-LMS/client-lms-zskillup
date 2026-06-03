import Link from 'next/link';
import { Star, Users, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Card display shape — accepts either a live API company (most fields nullable)
 * or a fully-hydrated demo company. Numeric/string metadata used by the lower
 * row falls back when the live API doesn't provide them.
 */
export interface CompanyCardData {
  slug: string;
  name: string;
  tagline: string | null;
  accent: string | null;
  badge?: string | null;
  difficulty?: string;
  rating?: number;
  enrolled?: string;
  package?: string;
  mcqs?: string;
  rounds?: number;
}

/** A single company card. One template, many instances (DEMO + live API). */
export function CompanyCard({ company }: { company: CompanyCardData }) {
  const accent = company.accent ?? 'from-slate-700 to-slate-900';
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className={cn('relative h-28 bg-gradient-to-br p-4', accent)}>
        {company.badge ? (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy shadow-sm">
            {company.badge}
          </span>
        ) : null}
        <div className="flex h-full items-center justify-center">
          <span className="rounded-lg bg-white/95 px-4 py-2 text-lg font-bold text-navy shadow-sm">
            {company.name}
          </span>
        </div>
      </div>
      <div className="p-4">
        {company.tagline ? (
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            {company.tagline}
          </p>
        ) : null}
        <p className="mt-1 text-xs text-slate-500">
          {company.mcqs ?? 'Live question bank'}
          {company.rounds ? ` · ${company.rounds} rounds` : ''}
          {company.difficulty ? ` · ${company.difficulty}` : ''}
        </p>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
            <span className="font-semibold text-navy">{company.rating ?? 4.6}</span>
          </span>
          <span className="flex items-center gap-1">
            <Users className="size-3.5" aria-hidden="true" /> {company.enrolled ?? '10k+'}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden="true" /> {company.package ?? '3.5 – 9 LPA'}
          </span>
        </div>
        <Link
          href={`/dashboard/company/${company.slug}`}
          className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-navy transition-colors hover:border-orange hover:bg-orange/5"
        >
          View track →
        </Link>
      </div>
    </article>
  );
}
