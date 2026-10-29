'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, ClipboardList, Loader2, Play } from 'lucide-react';
import {
  getAssignedInterviews,
  startAssignedInterview,
  type AssignedInterview,
} from '@/lib/api/interview-assignments';
import { Button } from '@/components/ui/button';
import { StatusPill, type StatusTone } from '@/components/student/StatusPill';

/**
 * Mock interviews an admin or the student's placement office assigned to them.
 *
 * Deliberately ABOVE the self-serve practice panel and OUTSIDE the paywall gate: an
 * assigned interview is work the college set, it does not consume the free-interview
 * allowance, and gating it behind an upsell would block a student from doing what their
 * placement office told them to do.
 *
 * Renders nothing when there are no assignments, so a student with none sees exactly the
 * page they saw before this feature existed.
 */

const ATTEMPT_TONE: Record<string, { label: string; tone: StatusTone }> = {
  scheduled: { label: 'Not started', tone: 'info' },
  in_progress: { label: 'In progress', tone: 'warning' },
  completed: { label: 'Completed', tone: 'positive' },
  abandoned: { label: 'Abandoned', tone: 'negative' },
};

const dueLabel = (iso: string | null) => {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms)) return null;
  if (ms <= 0) return 'Closed';
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `Due in ${days} day${days === 1 ? '' : 's'}`;
  const hours = Math.max(1, Math.floor(ms / 3_600_000));
  return `Due in ${hours} hour${hours === 1 ? '' : 's'}`;
};

export function AssignedInterviews() {
  const router = useRouter();
  const [rows, setRows] = useState<AssignedInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getAssignedInterviews()
      .then(setRows)
      // Fails quiet: this is an additional panel, and an error here must not take the
      // self-serve interview page down with it.
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const begin = async (a: AssignedInterview) => {
    setBusyId(a.id);
    setErr(null);
    try {
      // Already started (or finished) → go straight to it rather than creating a second.
      const id = a.interviewId ?? (await startAssignedInterview(a.id)).id;
      router.push(`/mock-interview/${id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not open that interview.');
      setBusyId(null);
    }
  };

  if (loading) return null;
  if (rows.length === 0) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
          <ClipboardList className="size-5" aria-hidden />
        </span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Assigned to you
          </p>
          <h2 className="text-lg font-bold text-navy">Interviews your college set</h2>
          <p className="mt-1 text-sm text-slate-600">
            These don&apos;t use your free-interview allowance.
          </p>
        </div>
      </div>

      {err && (
        <div
          className="mt-4 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200"
          role="alert"
        >
          {err}
        </div>
      )}

      <ul className="mt-5 space-y-3">
        {rows.map((a) => {
          const state = a.attemptStatus ? ATTEMPT_TONE[a.attemptStatus] : null;
          const due = dueLabel(a.dueAt);
          const done = a.attemptStatus === 'completed';
          return (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="min-w-0">
                <p className="font-bold text-navy">{a.title}</p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {a.topic} · {a.difficulty} · {a.durationMinutes} min
                </p>
                {a.instructions ? (
                  <p className="mt-1.5 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                    {a.instructions}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {state ? <StatusPill tone={state.tone} label={state.label} /> : null}
                  {done && a.overallPct !== null ? (
                    <span className="text-xs font-semibold text-emerald-700">
                      Scored {Math.round(a.overallPct)}%
                    </span>
                  ) : null}
                  {due ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                      <CalendarClock className="size-3" aria-hidden /> {due}
                    </span>
                  ) : null}
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant={done ? 'outline' : 'default'}
                onClick={() => void begin(a)}
                disabled={busyId === a.id}
              >
                {busyId === a.id ? <Loader2 className="animate-spin" /> : done ? null : <Play />}
                {done ? 'View result' : a.interviewId ? 'Resume' : 'Start'}
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
