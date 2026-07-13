'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { deleteInterview, listInterviews } from '@/lib/api/mock-interviews';
import type { MockInterviewSummaryDto } from '@/shared/dto/mock-interview.dto';
import { QuickStart } from './QuickStart';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Award, CheckCircle2, ClipboardList, Loader2, MessagesSquare, Play, Sparkles, Target, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  abandoned: 'bg-slate-100 text-slate-500',
};

const STEPS = [
  { icon: Target, title: 'Pick a focus', text: 'Topic, style, difficulty & length' },
  { icon: MessagesSquare, title: 'Talk it out', text: 'The interviewer speaks — you answer out loud' },
  { icon: Award, title: 'Get scored feedback', text: 'Strengths, gaps & a rubric score' },
];

function scoreText(n: number): string {
  if (n >= 70) return 'text-green-600';
  if (n >= 45) return 'text-amber-600';
  return 'text-red-500';
}

type Tab = 'new' | 'previous';

export function MockInterviewHome() {
  const [tab, setTab] = useState<Tab>('new');
  const [rows, setRows] = useState<MockInterviewSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listInterviews());
    } catch {
      /* leave empty */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const completed = rows.filter((r) => r.status === 'completed');
  const scored = completed.filter((r) => r.overallPercentage !== null);
  const avg = scored.length ? Math.round(scored.reduce((n, r) => n + (r.overallPercentage ?? 0), 0) / scored.length) : null;

  const remove = async (id: string, topic: string) => {
    if (!window.confirm(`Delete the ${topic} interview?`)) return;
    try {
      await deleteInterview(id);
      load();
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div data-tour="mi:stats" className="grid grid-cols-3 gap-3">
        <Stat icon={ClipboardList} label="Total" value={rows.length} tint="text-navy" />
        <Stat icon={CheckCircle2} label="Completed" value={completed.length} tint="text-green-600" />
        <Stat icon={Award} label="Avg score" value={avg} suffix="%" tint="text-orange" />
      </div>

      {/* Tabs */}
      <div data-tour="mi:tabs" className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 text-sm font-semibold">
        {(['new', 'previous'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn('flex-1 rounded-lg px-4 py-2 transition-colors', tab === t ? 'bg-white text-navy shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            {t === 'new' ? 'New interview' : `Previous${rows.length ? ` (${rows.length})` : ''}`}
          </button>
        ))}
      </div>

      {tab === 'new' ? (
        <div className="space-y-4">
          {/* How it works */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.title}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-orange/10 text-orange">
                    <Icon className="size-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-navy">{s.title}</p>
                    <p className="truncate text-[11px] text-slate-400">{s.text}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
          <QuickStart />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-slate-400" /></div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <div className="grid size-12 place-items-center rounded-full bg-slate-50">
                <Sparkles className="size-6 text-slate-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-navy">No interviews yet</p>
                <p className="mt-0.5 text-xs text-slate-400">Start your first mock from the New tab.</p>
              </div>
              <button onClick={() => setTab('new')} className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-orange px-4 py-2 text-xs font-bold text-[#171717] hover:bg-orange/90">
                <Play className="size-3.5" /> Start an interview
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-slate-50/70">
                  <div className="flex min-w-0 items-center gap-3">
                    {r.status === 'completed' && r.overallPercentage !== null ? (
                      <div className={cn('grid size-11 shrink-0 place-items-center rounded-full border-2 text-sm font-black tabular-nums', r.overallPercentage >= 70 ? 'border-green-200 bg-green-50' : r.overallPercentage >= 45 ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50', scoreText(r.overallPercentage))}>
                        {r.overallPercentage}
                      </div>
                    ) : (
                      <div className="grid size-11 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-400">
                        <MessagesSquare className="size-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-navy">{r.topic}</p>
                      <p className="text-xs text-slate-400">
                        {r.difficulty} · {r.durationMinutes} min · {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('hidden rounded-full px-2.5 py-0.5 text-[11px] font-semibold sm:inline', STATUS_STYLE[r.status] ?? 'bg-slate-100 text-slate-600')}>{r.status.replace('_', ' ')}</span>
                    {r.status === 'completed' ? (
                      <Link href={`/mock-interview/${r.id}/result`} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-slate-50"><CheckCircle2 className="size-3.5" /> Result</Link>
                    ) : r.status === 'scheduled' || r.status === 'in_progress' ? (
                      <Link href={`/mock-interview/${r.id}/take`} className="inline-flex items-center gap-1 rounded-lg bg-orange px-3 py-1.5 text-xs font-semibold text-[#171717] hover:bg-orange/90"><Play className="size-3.5" /> Resume</Link>
                    ) : null}
                    <button onClick={() => remove(r.id, r.topic)} className="rounded-lg border border-slate-200 p-1.5 text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500" aria-label="Delete"><Trash2 className="size-4" /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, suffix, tint }: { icon: typeof Award; label: string; value: number | null; suffix?: string; tint: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <Icon className={cn('mx-auto mb-1 size-4', tint)} />
      <p className={cn('text-center text-2xl font-black tabular-nums', tint)}>
        {value === null ? '—' : <AnimatedNumber value={value} suffix={suffix} />}
      </p>
      <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
    </div>
  );
}
