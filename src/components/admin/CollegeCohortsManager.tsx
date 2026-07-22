'use client';

import { useEffect, useState } from 'react';
import { Loader2, Mail, Plus, Users } from 'lucide-react';
import {
  createCollegeCohort,
  getCollegeCohorts,
  inviteCollegeStudents,
} from '@/lib/api/admin-cohorts';
import type { CohortDto, TpoBulkInviteResult } from '@/shared';

const inputCls =
  'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-[#f5b400] focus:ring-1 focus:ring-[#f5b400]';

function parseInvites(text: string) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [email, fullName, rollNumber, branch] = line.split(',').map((c) => c?.trim());
      return { email, fullName: fullName || undefined, rollNumber: rollNumber || undefined, branch: branch || undefined };
    })
    .filter((r) => r.email);
}

/**
 * Admin cohort + invitation management for a single college. Configuration that
 * used to live in the TPO console - TPOs are now read-only. Self-fetching.
 */
export function CollegeCohortsManager({ collegeId, onChange }: { collegeId: string; onChange?: () => void }) {
  const [cohorts, setCohorts] = useState<CohortDto[] | null>(null);
  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  const [branch, setBranch] = useState('');
  const [busyCohort, setBusyCohort] = useState(false);

  const [raw, setRaw] = useState('');
  const [cohortId, setCohortId] = useState('');
  const [busyInvite, setBusyInvite] = useState(false);
  const [inviteResult, setInviteResult] = useState<TpoBulkInviteResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = () =>
    getCollegeCohorts(collegeId)
      .then(setCohorts)
      .catch(() => setCohorts([]));

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collegeId]);

  async function addCohort() {
    if (name.trim().length < 2) {
      setErr('Cohort name needs at least 2 characters');
      return;
    }
    setBusyCohort(true);
    setErr(null);
    try {
      await createCollegeCohort(collegeId, {
        name: name.trim(),
        year: year ? Number(year) : undefined,
        branch: branch.trim() || undefined,
      });
      setName('');
      setYear('');
      setBranch('');
      await load();
      onChange?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not create cohort');
    } finally {
      setBusyCohort(false);
    }
  }

  async function invite() {
    const invitations = parseInvites(raw);
    if (invitations.length === 0) {
      setErr('Add at least one line: email[, name, roll, branch]');
      return;
    }
    setBusyInvite(true);
    setErr(null);
    setInviteResult(null);
    try {
      const res = await inviteCollegeStudents(collegeId, { invitations, cohortId: cohortId || undefined });
      setInviteResult(res);
      setRaw('');
      await load();
      onChange?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not send invitations');
    } finally {
      setBusyInvite(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Cohorts */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-navy">
          <Users className="size-4 text-[#f5b400]" /> Cohorts / batches
        </h2>
        {cohorts === null ? (
          <div className="grid h-24 place-items-center">
            <Loader2 className="size-5 animate-spin text-slate-400" />
          </div>
        ) : cohorts.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No cohorts yet - create the first batch below.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {cohorts.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-navy">{c.name}</p>
                  <p className="text-xs text-slate-500">
                    {[c.branch, c.year].filter(Boolean).join(' · ') || 'All branches'}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold tabular-nums text-slate-600">
                  {c.studentCount} student{c.studentCount === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4">
          <label className="text-xs font-semibold text-slate-600">
            Name
            <input className={`mt-1 block w-44 ${inputCls}`} value={name} onChange={(e) => setName(e.target.value)} placeholder="B.Tech CSE 2026" />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Year
            <input type="number" className={`mt-1 block w-24 ${inputCls}`} value={year} onChange={(e) => setYear(e.target.value)} placeholder="2026" />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Branch
            <input className={`mt-1 block w-28 ${inputCls}`} value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="CSE" />
          </label>
          <button
            type="button"
            onClick={() => void addCohort()}
            disabled={busyCohort}
            className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {busyCohort ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add
          </button>
        </div>
      </section>

      {/* Invite students */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-navy">
          <Mail className="size-4 text-[#f5b400]" /> Invite students
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          One per line: <code className="rounded bg-slate-100 px-1">email, name, roll, branch</code> (name/roll/branch optional).
        </p>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={5}
          placeholder={'priya@college.edu, Priya Sharma, 24CS001, CSE\nrahul@college.edu'}
          className={`mt-2 block w-full font-mono text-xs ${inputCls}`}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select value={cohortId} onChange={(e) => setCohortId(e.target.value)} className={inputCls} aria-label="Cohort">
            <option value="">No cohort</option>
            {(cohorts ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void invite()}
            disabled={busyInvite}
            className="btn-brand inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition hover:brightness-105 disabled:opacity-60"
          >
            {busyInvite ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />} Send invites
          </button>
        </div>
        {inviteResult && (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
            {inviteResult.created} invited{inviteResult.skipped ? ` · ${inviteResult.skipped} already registered` : ''}.
          </p>
        )}
      </section>

      {err && <p className="lg:col-span-2 text-sm font-semibold text-rose-600">{err}</p>}
    </div>
  );
}
