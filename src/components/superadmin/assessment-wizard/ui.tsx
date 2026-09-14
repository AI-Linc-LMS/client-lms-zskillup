'use client';

import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { Hand, Pin, Shuffle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusPill } from '@/components/student/StatusPill';
import { DIFFICULTY_TONE } from '@/lib/ui-maps';
import type { ItemOrigin } from './selection';

/** Shared bits for the assessment wizard (frontend/CLAUDE §4, §9). */

export const fieldLabelCls = 'block text-xs font-semibold text-slate-600';
export const eyebrowCls = 'text-[10px] font-semibold uppercase tracking-widest text-slate-400';
export const inputCls =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30 disabled:cursor-not-allowed disabled:opacity-50';
export const checkboxCls =
  'size-4 shrink-0 rounded border-slate-300 accent-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40 disabled:cursor-not-allowed disabled:opacity-40';

export function DifficultyPill({ value }: { value: string | null | undefined }) {
  const key = (value ?? '').toUpperCase();
  const tone = DIFFICULTY_TONE[key];
  return tone ? <StatusPill tone={tone.tone} label={tone.label} /> : <StatusPill tone="neutral" label={value || 'Unrated'} />;
}

const ORIGIN: Record<ItemOrigin, { label: string; icon: typeof Shuffle; title: string }> = {
  RANDOM: { label: 'Random', icon: Shuffle, title: 'Drawn at random from the bank' },
  MANUAL: { label: 'Manual', icon: Hand, title: 'Picked by hand' },
  AI: { label: 'AI', icon: Sparkles, title: 'Generated with AI because the bank was short' },
};

/** How an item got into the assessment — icon + text, never colour alone. */
export function OriginBadge({ origin }: { origin: ItemOrigin }) {
  const o = ORIGIN[origin];
  const Icon = o.icon;
  return (
    <span
      title={o.title}
      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
    >
      <Icon className="size-3" aria-hidden />
      {o.label}
    </span>
  );
}

/** "This exact question is what gets published" — nothing is re-drawn at publish time. */
export function FixedMarker() {
  return (
    <span
      title="Fixed: students get exactly this question — it is not re-drawn at publish time"
      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-navy ring-1 ring-slate-200"
    >
      <Pin className="size-3" aria-hidden />
      Fixed
    </span>
  );
}

export function ErrorAlert({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="alert" className={cn('rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200', className)}>
      {children}
    </div>
  );
}

export function NoticeBox({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="status" className={cn('rounded-md bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200', className)}>
      {children}
    </div>
  );
}

/** Filter-chip switch (§4.12) — a small single-choice group. */
export function ChipSwitch<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex flex-wrap items-center gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40 focus-visible:ring-offset-2',
            value === o.value ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Underline tabs (§4.12) with roving arrow-key focus. Render the panel with
 *  `role="tabpanel"`, `id={`${idBase}-panel`}` and `aria-labelledby={`${idBase}-${value}`}`. */
export function UnderlineTabs<T extends string>({
  idBase,
  label,
  value,
  tabs,
  onChange,
}: {
  idBase: string;
  label: string;
  value: T;
  tabs: Array<{ value: T; label: string; count?: number }>;
  onChange: (v: T) => void;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    refs.current[next]?.focus();
    onChange(tabs[next].value);
  };
  return (
    <div role="tablist" aria-label={label} className="flex items-center gap-5 border-b border-slate-200">
      {tabs.map((t, i) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={`${idBase}-${t.value}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`${idBase}-panel`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              '-mb-px inline-flex items-center gap-1.5 border-b-2 px-0.5 pb-2 pt-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40',
              active ? 'border-orange font-semibold text-navy' : 'border-transparent text-slate-400 hover:text-slate-600',
            )}
          >
            {t.label}
            {t.count !== undefined ? (
              <span
                className={cn(
                  'rounded-full px-1.5 py-px text-[10px] font-semibold',
                  active ? 'bg-orange text-navy' : 'bg-slate-100 text-slate-500',
                )}
              >
                {t.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Short, readable id for places where a label isn't known (e.g. an id only the server named). */
export const shortId = (id: string) => id.slice(0, 8);
