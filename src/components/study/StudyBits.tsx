'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TASK_META } from './study-ui';
import type { StudyTaskDto } from '@/shared/dto/study-plan.dto';

/** Animated circular progress ring with centred content (used on the dark hero). */
export function ProgressRing({
  pct,
  size = 132,
  stroke = 11,
  children,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  const off = c * (1 - clamped / 100);
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-white/15" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          className="fill-none"
          stroke="url(#sp-ring-grad)"
          strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? off : c }}
          animate={{ strokeDashoffset: off }}
          transition={reduce ? { duration: 0 } : { duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
        <defs>
          <linearGradient id="sp-ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffb877" />
            <stop offset="1" stopColor="#f37021" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
        {children}
      </div>
    </div>
  );
}

/** One task row — a completion toggle (auto-verified or manual) + a CTA into the
 *  real activity. */
export function TaskRow({
  task,
  onToggle,
  disabled = false,
  busy = false,
}: {
  task: StudyTaskDto;
  onToggle: (done: boolean) => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  const meta = TASK_META[task.kind];
  const Icon = meta.icon;
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl border p-2.5 transition-colors',
        task.done ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-white hover:border-slate-300',
      )}
    >
      <button
        type="button"
        onClick={() => onToggle(!task.done)}
        disabled={disabled || busy}
        aria-pressed={task.done}
        aria-label={task.done ? 'Mark not done' : 'Mark done'}
        className={cn(
          'grid size-7 shrink-0 place-items-center rounded-full border-2 transition',
          task.done
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-slate-300 text-transparent hover:border-orange hover:text-orange/30',
          (disabled || busy) && 'cursor-not-allowed opacity-60',
        )}
      >
        {busy ? <Loader2 className="size-3.5 animate-spin text-slate-400" /> : <Check className="size-4" />}
      </button>
      <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', meta.bg, meta.text)}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm font-semibold', task.done ? 'text-slate-400 line-through' : 'text-navy')}>
          {task.title}
        </p>
        <p className="truncate text-xs text-slate-500">{task.detail}</p>
      </div>
      <span className="hidden shrink-0 text-[11px] font-semibold tabular-nums text-slate-400 sm:block">
        ~{task.estMinutes}m
      </span>
      <Link
        href={task.href}
        className={cn(
          'shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition',
          task.done ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'bg-navy text-white hover:bg-navy/90',
        )}
      >
        {task.cta}
      </Link>
    </div>
  );
}
