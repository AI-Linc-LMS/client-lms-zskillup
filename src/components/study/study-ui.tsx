import {
  BookOpen,
  ClipboardCheck,
  Code2,
  RefreshCw,
  Target,
  Timer,
  type LucideIcon,
} from 'lucide-react';
import type { StudyPhase, StudyTaskKind } from '@/shared/dto/study-plan.dto';

/** Per-phase visual identity - bands the roadmap into its three arcs. */
export const PHASE_META: Record<
  StudyPhase,
  { label: string; tagline: string; accent: string; text: string; grad: string; dot: string; soft: string }
> = {
  foundation: {
    label: 'Foundation',
    tagline: 'Build the base',
    accent: '#0ea5e9',
    text: 'text-sky-600',
    grad: 'from-sky-400 to-sky-600',
    dot: 'bg-sky-500',
    soft: 'bg-sky-50',
  },
  practice: {
    label: 'Practice',
    tagline: 'Sharpen & apply',
    accent: '#f5b400',
    text: 'text-[#f5b400]',
    grad: 'from-[#ffd24d] to-[#f5b400]',
    dot: 'bg-[#f5b400]',
    soft: 'bg-orange-50',
  },
  interview: {
    label: 'Interview-Ready',
    tagline: 'Revise & mock',
    accent: '#8b5cf6',
    text: 'text-violet-600',
    grad: 'from-violet-400 to-violet-600',
    dot: 'bg-violet-500',
    soft: 'bg-violet-50',
  },
};

/** Per-task-kind icon + colour. */
export const TASK_META: Record<StudyTaskKind, { icon: LucideIcon; label: string; text: string; bg: string }> = {
  learn: { icon: BookOpen, label: 'Learn', text: 'text-indigo-600', bg: 'bg-indigo-50' },
  practice: { icon: Target, label: 'Practice', text: 'text-[#f5b400]', bg: 'bg-orange-50' },
  quiz: { icon: Timer, label: 'Quiz', text: 'text-amber-600', bg: 'bg-amber-50' },
  mock: { icon: ClipboardCheck, label: 'Mock', text: 'text-violet-600', bg: 'bg-violet-50' },
  coding: { icon: Code2, label: 'Coding', text: 'text-emerald-600', bg: 'bg-emerald-50' },
  review: { icon: RefreshCw, label: 'Review', text: 'text-sky-600', bg: 'bg-sky-50' },
};

/** "Unlocks in 3 days" / "Unlocks tomorrow" copy from an ISO date. */
export function unlockCopy(unlockDate: string): string {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const days = Math.round(
    (new Date(`${unlockDate}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86_400_000,
  );
  if (days <= 0) return 'Unlocked';
  if (days === 1) return 'Unlocks tomorrow';
  return `Unlocks in ${days} days`;
}
