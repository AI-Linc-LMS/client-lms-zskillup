'use client';

import { useEffect, useMemo, useState } from 'react';
import { getMe } from '@/lib/api/me';
import {
  listAdminColleges,
  listAdminCollegeCohorts,
  type AdminCohortRow,
  type AdminCollegeRow,
} from '@/lib/api/admin';
import { sendBroadcast } from '@/lib/api/broadcasts';
import { describeError } from '@/lib/api/errors';
import type { BroadcastScope } from '@/shared/dto/broadcast.dto';
import { BadgeCheck, Loader2, Lock, Megaphone, XCircle } from 'lucide-react';

const SCOPES: { value: BroadcastScope; label: string; hint: string }[] = [
  { value: 'PLATFORM', label: 'All students', hint: 'Every active student on the platform' },
  { value: 'COLLEGE', label: 'One college', hint: 'Active students at a chosen college' },
  { value: 'COHORT', label: 'One cohort', hint: 'Active students in a chosen batch' },
];

/**
 * Broadcast composer (Phase 3). Sends an in-app notification to a target
 * audience. Gated by the `canBroadcast` capability (SUPER_ADMIN always holds it);
 * an ADMIN without it sees a locked state. Group-agnostic — rendered by both the
 * /admin and /superadmin Broadcasts pages.
 */
export function BroadcastComposer() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [colleges, setColleges] = useState<AdminCollegeRow[]>([]);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [scope, setScope] = useState<BroadcastScope>('PLATFORM');
  const [collegeId, setCollegeId] = useState('');
  const [cohorts, setCohorts] = useState<AdminCohortRow[]>([]);
  const [cohortId, setCohortId] = useState('');
  const [cohortsLoading, setCohortsLoading] = useState(false);

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await getMe();
        if (!alive) return;
        const can = me.capabilities?.canBroadcast ?? false;
        setAllowed(can);
        if (can) {
          const list = await listAdminColleges().catch(() => [] as AdminCollegeRow[]);
          if (alive) setColleges(list.filter((c) => c.status === 'ACTIVE'));
        }
      } catch {
        if (alive) setAllowed(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Load the chosen college's cohorts for the COHORT scope picker.
  useEffect(() => {
    if (scope !== 'COHORT' || !collegeId) {
      setCohorts([]);
      setCohortId('');
      return;
    }
    let alive = true;
    setCohortsLoading(true);
    setCohortId('');
    (async () => {
      try {
        const list = await listAdminCollegeCohorts(collegeId);
        if (alive) setCohorts(list);
      } catch {
        if (alive) setCohorts([]);
      } finally {
        if (alive) setCohortsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [scope, collegeId]);

  const canSubmit = useMemo(() => {
    if (title.trim().length < 3 || body.trim().length < 3) return false;
    if (scope === 'COLLEGE' && !collegeId) return false;
    if (scope === 'COHORT' && (!collegeId || !cohortId)) return false;
    return true;
  }, [title, body, scope, collegeId, cohortId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await sendBroadcast({
        title: title.trim(),
        body: body.trim(),
        link: link.trim() || null,
        scope,
        collegeId: scope === 'COLLEGE' || scope === 'COHORT' ? collegeId : undefined,
        cohortId: scope === 'COHORT' ? cohortId : undefined,
      });
      setSuccess(
        `Broadcast delivered to ${result.recipients.toLocaleString()} student${
          result.recipients === 1 ? '' : 's'
        }.`,
      );
      setTitle('');
      setBody('');
      setLink('');
    } catch (err) {
      setError(describeError(err, 'Failed to send the broadcast.'));
    } finally {
      setSending(false);
    }
  };

  if (allowed === null) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16">
        <Loader2 className="size-6 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white py-16 text-center">
        <Lock className="size-8 text-slate-400" />
        <p className="max-w-sm text-sm text-slate-600">
          You don&apos;t have the <span className="font-semibold">Broadcast</span> capability. Ask a
          super-admin to grant it from your account&apos;s capabilities.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-5 rounded-xl border border-slate-200 bg-white p-6">
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <BadgeCheck className="size-4 shrink-0" /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <XCircle className="size-4 shrink-0" /> {error}
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
          Audience
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {SCOPES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setScope(s.value)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                scope === s.value
                  ? 'border-[#ffc42d] bg-[#fff5ea] ring-1 ring-[#ffc42d]'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <p className="text-sm font-semibold text-navy">{s.label}</p>
              <p className="text-xs text-slate-500">{s.hint}</p>
            </button>
          ))}
        </div>
      </div>

      {(scope === 'COLLEGE' || scope === 'COHORT') && (
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
            College
          </label>
          <select
            value={collegeId}
            onChange={(e) => setCollegeId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#ffc42d] focus:outline-none focus:ring-1 focus:ring-[#ffc42d]"
          >
            <option value="">Select a college…</option>
            {colleges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {scope === 'COHORT' && collegeId && (
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
            Cohort
          </label>
          {cohortsLoading ? (
            <div className="flex items-center gap-2 py-2 text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin" /> Loading cohorts…
            </div>
          ) : cohorts.length === 0 ? (
            <p className="py-2 text-sm text-slate-500">No cohorts at this college yet.</p>
          ) : (
            <select
              value={cohortId}
              onChange={(e) => setCohortId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#ffc42d] focus:outline-none focus:ring-1 focus:ring-[#ffc42d]"
            >
              <option value="">Select a cohort…</option>
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.year ? ` (${c.year})` : ''} · {c.studentCount} student
                  {c.studentCount === 1 ? '' : 's'}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
          Title
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="e.g. New mock test available"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#ffc42d] focus:outline-none focus:ring-1 focus:ring-[#ffc42d]"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
          Message
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="What do you want students to know?"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#ffc42d] focus:outline-none focus:ring-1 focus:ring-[#ffc42d]"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
          Link <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          maxLength={300}
          placeholder="/assessments"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#ffc42d] focus:outline-none focus:ring-1 focus:ring-[#ffc42d]"
        />
      </div>

      <button
        type="submit"
        disabled={!canSubmit || sending}
        className="inline-flex items-center gap-2 rounded-lg bg-orange px-4 py-2.5 text-sm font-semibold text-[#171717] hover:bg-orange/90 disabled:opacity-50"
      >
        {sending ? <Loader2 className="size-4 animate-spin" /> : <Megaphone className="size-4" />}
        Send broadcast
      </button>
    </form>
  );
}
