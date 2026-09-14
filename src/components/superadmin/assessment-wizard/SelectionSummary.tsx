import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { SelectionTally } from './selection';
import { eyebrowCls } from './ui';

/**
 * Always-visible selection summary for the Questions and Review steps: totals, marks,
 * Random / Manual / AI split, difficulty mix and per-section counts. In edit mode the
 * assessment's current set (server numbers) is shown alongside what is being added.
 */
export function SelectionSummary({
  tally,
  existing,
  className,
}: {
  tally: SelectionTally;
  /** Edit mode: the assessment as it stands (from the server's editable snapshot). */
  existing?: { total: number; mcq: number; coding: number; marks: number } | null;
  className?: string;
}) {
  const adding = !!existing;
  return (
    <section aria-label="Selection summary" className={cn('rounded-xl border border-slate-200 bg-white p-5 shadow-sm', className)}>
      <p className={eyebrowCls}>{adding ? 'Adding to this assessment' : 'Selection summary'}</p>
      <p className="mt-2 text-[26px] font-extrabold leading-none text-navy" aria-live="polite">
        {tally.total}
        <span className="ml-1.5 text-sm font-semibold text-slate-500">{tally.total === 1 ? 'question' : 'questions'}</span>
      </p>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat label="MCQ" value={tally.mcq} />
        <Stat label="Coding" value={tally.coding} />
        <Stat label="Marks" value={tally.marks} />
      </dl>

      <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
        <Row label="How chosen">
          <Chip>Random {tally.byOrigin.RANDOM}</Chip>
          <Chip>Manual {tally.byOrigin.MANUAL}</Chip>
          {tally.byOrigin.AI ? <Chip>AI {tally.byOrigin.AI}</Chip> : null}
        </Row>
        <Row label="Difficulty mix">
          <Chip>Easy {tally.byDifficulty.EASY}</Chip>
          <Chip>Medium {tally.byDifficulty.MEDIUM}</Chip>
          <Chip>Hard {tally.byDifficulty.HARD}</Chip>
          {tally.byDifficulty.OTHER ? <Chip>Unrated {tally.byDifficulty.OTHER}</Chip> : null}
        </Row>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className={eyebrowCls}>Per section</p>
        <ul className="mt-2 space-y-1.5">
          {tally.sections.map((s) => (
            <li key={s.key} className="flex items-baseline justify-between gap-2 text-sm">
              <span className="min-w-0 truncate text-slate-600">{s.name || 'Untitled section'}</span>
              <span className="shrink-0 text-xs text-slate-500">
                {s.mcq} MCQ · {s.coding} coding · {s.marks} marks
              </span>
            </li>
          ))}
        </ul>
      </div>

      {existing ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className={eyebrowCls}>Already in the assessment</p>
          <p className="mt-1 text-sm text-slate-600">
            {existing.total} questions ({existing.mcq} MCQ · {existing.coding} coding) · {existing.marks} marks
          </p>
        </div>
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 px-2 py-2">
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-base font-bold text-navy">{value}</dd>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-600">{label}</p>
      <div className="mt-1 flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{children}</span>;
}
