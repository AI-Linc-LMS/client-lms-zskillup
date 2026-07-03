'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { deleteInterview, listInterviews } from '@/lib/api/mock-interviews';
import type { MockInterviewSummaryDto } from '@/shared/dto/mock-interview.dto';
import { QuickStart } from './QuickStart';
import { CheckCircle2, ClipboardList, Loader2, Play, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  abandoned: 'bg-slate-100 text-slate-500',
};

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
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total" value={rows.length} />
        <Stat label="Completed" value={completed.length} />
        <Stat label="Avg score" value={avg === null ? '—' : `${avg}%`} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 text-sm font-semibold">
        {(['new', 'previous'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn('flex-1 rounded-md px-4 py-2 transition-colors', tab === t ? 'bg-white text-navy shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            {t === 'new' ? 'New interview' : 'Previous'}
          </button>
        ))}
      </div>

      {tab === 'new' ? (
        <QuickStart />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-slate-400" /></div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <ClipboardList className="size-8 text-slate-300" />
              <p className="text-sm text-slate-400">No interviews yet. Start one from the New tab.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 p-4 hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-navy">{r.topic}</p>
                    <p className="text-xs text-slate-400">
                      {r.difficulty} · {r.durationMinutes} min · {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.overallPercentage !== null && <span className="text-sm font-bold text-navy">{r.overallPercentage}%</span>}
                    <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', STATUS_STYLE[r.status] ?? 'bg-slate-100 text-slate-600')}>{r.status.replace('_', ' ')}</span>
                    {r.status === 'completed' ? (
                      <Link href={`/mock-interview/${r.id}/result`} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-slate-50"><CheckCircle2 className="size-3.5" /> Result</Link>
                    ) : r.status === 'scheduled' || r.status === 'in_progress' ? (
                      <Link href={`/mock-interview/${r.id}/take`} className="inline-flex items-center gap-1 rounded-lg bg-orange px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange/90"><Play className="size-3.5" /> Resume</Link>
                    ) : null}
                    <button onClick={() => remove(r.id, r.topic)} className="rounded-lg border border-red-200 p-1.5 text-red-500 hover:bg-red-50" aria-label="Delete"><Trash2 className="size-4" /></button>
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

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
      <p className="text-2xl font-black text-navy tabular-nums">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
    </div>
  );
}
