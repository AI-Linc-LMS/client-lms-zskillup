import Link from 'next/link';
import { Star, Users, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DemoCompany } from '@/lib/demo-data';

/** A single company card (matches the demo companies grid). One template, many instances. */
export function CompanyCard({ company }: { company: DemoCompany }) {
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className={cn('relative h-28 bg-gradient-to-br p-4', company.accent)}>
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
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          {company.tagline}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {company.mcqs} · {company.rounds} rounds · {company.difficulty}
        </p>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
            <span className="font-semibold text-navy">{company.rating}</span>
          </span>
          <span className="flex items-center gap-1">
            <Users className="size-3.5" aria-hidden="true" /> {company.enrolled}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden="true" /> {company.package}
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
