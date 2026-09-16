import { cn } from '@/lib/utils';

/**
 * Labels + tones shared by the two bank consoles (question bank, coding bank) so a
 * question's provenance, difficulty and company tags read the same in both.
 */

export const SOURCE_LABEL: Record<string, string> = {
  PREVIOUS_YEAR_QUESTIONS: 'PYQ',
  MEMORY_BASED: 'Memory-based',
  PATTERN_BASED: 'Pattern-based',
  MOCK_DERIVED: 'Mock-derived',
  AI_GENERATED: 'AI-generated',
};

export const SOURCE_TONE: Record<string, string> = {
  PREVIOUS_YEAR_QUESTIONS: 'bg-violet-50 text-violet-700 ring-violet-200',
  MEMORY_BASED: 'bg-sky-50 text-sky-700 ring-sky-200',
  PATTERN_BASED: 'bg-slate-50 text-slate-600 ring-slate-200',
  MOCK_DERIVED: 'bg-amber-50 text-amber-700 ring-amber-200',
  AI_GENERATED: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200',
};

export const DIFF_TONE: Record<string, string> = {
  EASY: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  MEDIUM: 'bg-amber-50 text-amber-700 ring-amber-200',
  HARD: 'bg-rose-50 text-rose-700 ring-rose-200',
};

/** Neutral chip for a question's type (MCQ / Multi-select / Numeric / Coding). */
export function TypeChip({ label }: { label: string }) {
  return (
    <span className="whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
      {label}
    </span>
  );
}

/**
 * Company tags as compact chips: the first `max` by name, then a "+N" chip whose title
 * (and screen-reader text) names the rest. Unknown slugs fall back to the slug itself.
 */
export function CompanyChips({
  slugs,
  nameBySlug,
  max = 2,
  className,
}: {
  slugs: string[];
  nameBySlug: Record<string, string>;
  max?: number;
  className?: string;
}) {
  if (slugs.length === 0) return <span className="text-slate-500">-</span>;
  const names = slugs.map((s) => nameBySlug[s] ?? s);
  const shown = names.slice(0, max);
  const rest = names.slice(max);
  return (
    <span className={cn('flex flex-wrap items-center gap-1', className)}>
      {shown.map((n, i) => (
        <span
          key={`${slugs[i]}`}
          className="whitespace-nowrap rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200"
        >
          {n}
        </span>
      ))}
      {rest.length ? (
        <span
          title={rest.join(', ')}
          className="whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-200"
        >
          <span aria-hidden>+{rest.length}</span>
          <span className="sr-only">and {rest.join(', ')}</span>
        </span>
      ) : null}
    </span>
  );
}
