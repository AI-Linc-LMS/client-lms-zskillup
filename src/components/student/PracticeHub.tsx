import Link from 'next/link';
import { Building2, Target, Brain, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PRACTICE_HUB } from '@/lib/demo-data';

/**
 * Practice hub — 3-card grid below the course table on the student dashboard.
 * Each card has a colored icon tile, a heading, a 2-line body, and a "Start /
 * Build / Browse →" link. The middle card (Practice) is the active accent —
 * ring + soft orange tint — so the user's eye lands there first.
 */

const ACCENTS = [
  { tile: 'bg-sky-50 text-sky-600 ring-1 ring-sky-100', card: 'border-slate-200' },
  { tile: 'bg-orange/10 text-[#f5b400] ring-1 ring-orange/20', card: 'border-orange/40 ring-1 ring-orange/20' },
  { tile: 'bg-violet-50 text-violet-600 ring-1 ring-violet-100', card: 'border-slate-200' },
] as const;

const ICONS = [Building2, Target, Brain];

export function PracticeHub() {
  return (
    <section>
      <h2 className="mb-4 text-2xl font-black tracking-tight text-navy">Practice hub</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {PRACTICE_HUB.map((card, i) => {
          const Icon = ICONS[i];
          const a = ACCENTS[i];
          return (
            <article
              key={card.title}
              className={cn(
                'flex flex-col rounded-3xl border bg-white p-6 transition-all hover:-translate-y-0.5',
                a.card,
              )}
            >
              <span className={cn('grid size-12 place-items-center rounded-2xl', a.tile)}>
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-bold text-navy">{card.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{card.body}</p>
              <Link
                href={card.href}
                className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-navy transition-colors hover:text-[#f5b400]"
              >
                {card.cta}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
