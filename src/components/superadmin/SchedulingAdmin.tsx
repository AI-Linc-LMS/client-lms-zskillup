'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BarChart3, Loader2, Pencil, Plus, ShieldAlert, Sparkles, Trash2, Users, Video, X } from 'lucide-react';
import { AssessmentWizard } from '@/components/superadmin/AssessmentWizard';
import { cn } from '@/lib/utils';
import { ApiRequestError } from '@/lib/api/types';
import { listCompanies, type ApiCompany } from '@/lib/api/catalog';
import { listAdminMocks, type AdminMockRow } from '@/lib/api/admin';
import {
  createScheduledAssessment,
  deleteScheduledAssessment,
  getAssessmentResults,
  listScheduledAssessments,
  updateScheduledAssessment,
  type ApiScheduledAssessment,
  type AssessmentResults,
} from '@/lib/api/scheduling';

/** Superadmin scheduler for company assessments (assessment lifecycle, Phase 2). */
export function SchedulingAdmin() {
  const [rows, setRows] = useState<ApiScheduledAssessment[] | null>(null);
  const [companies, setCompanies] = useState<ApiCompany[]>([]);
  const [mocks, setMocks] = useState<AdminMockRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // create form
  const [companyId, setCompanyId] = useState('');
  const [mockTestId, setMockTestId] = useState('');
  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [proctored, setProctored] = useState(true);
  const [creating, setCreating] = useState(false);
  const [results, setResults] = useState<AssessmentResults | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editWizardId, setEditWizardId] = useState<string | null>(null);

  // filters
  const [fCompany, setFCompany] = useState('');
  const [fStatus, setFStatus] = useState<'all' | 'upcoming' | 'live' | 'past' | 'inactive'>('all');
  const [fDuration, setFDuration] = useState<'all' | 'short' | 'medium' | 'long'>('all');

  const filtered = useMemo(() => {
    if (!rows) return [];
    const now = Date.now();
    return rows.filter((r) => {
      if (fCompany && r.companyId !== fCompany) return false;
      if (fDuration === 'short' && r.durationMinutes > 30) return false;
      if (fDuration === 'medium' && (r.durationMinutes <= 30 || r.durationMinutes > 90)) return false;
      if (fDuration === 'long' && r.durationMinutes <= 90) return false;
      const start = +new Date(r.scheduledAt);
      const end = start + r.durationMinutes * 60_000;
      if (fStatus === 'inactive') return !r.isActive;
      if (fStatus === 'upcoming') return now < start;
      if (fStatus === 'live') return now >= start && now <= end;
      if (fStatus === 'past') return now > end;
      return true;
    });
  }, [rows, fCompany, fStatus, fDuration]);

  const openResults = async (id: string) => {
    setResultsLoading(true);
    setResults(null);
    try {
      setResults(await getAssessmentResults(id));
    } catch {
      /* ignore */
    } finally {
      setResultsLoading(false);
    }
  };

  const load = () =>
    listScheduledAssessments()
      .then(setRows)
      .catch((e) => setErr(e instanceof ApiRequestError ? e.message : 'Could not load.'));

  useEffect(() => {
    void load();
    listCompanies().then(setCompanies).catch(() => {});
    listAdminMocks().then(setMocks).catch(() => {});
  }, []);

  const companyName = useMemo(
    () => Object.fromEntries(companies.map((c) => [c.id, c.name])),
    [companies],
  );

  const create = async () => {
    if (!companyId || !title.trim() || !scheduledAt) {
      setErr('Company, title and date/time are required.');
      return;
    }
    setCreating(true);
    setErr(null);
    try {
      await createScheduledAssessment({
        companyId,
        mockTestId: mockTestId || undefined,
        title: title.trim(),
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes,
        proctored,
      });
      setTitle('');
      setScheduledAt('');
      setMockTestId('');
      await load();
    } catch (e) {
      setErr(e instanceof ApiRequestError ? e.message : 'Could not schedule.');
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this scheduled assessment?')) return;
    setBusyId(id);
    try {
      await deleteScheduledAssessment(id);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (r: ApiScheduledAssessment) => {
    setBusyId(r.id);
    try {
      await updateScheduledAssessment(r.id, { isActive: !r.isActive });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {wizardOpen ? (
        <AssessmentWizard onClose={() => setWizardOpen(false)} onCreated={load} />
      ) : null}
      {editWizardId ? (
        <AssessmentWizard editId={editWizardId} onClose={() => setEditWizardId(null)} onCreated={load} />
      ) : null}

      {/* Build assessment (auto from question bank) */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#ffc42d]/30 bg-gradient-to-br from-[#ffc42d]/[0.06] to-transparent p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-[#ffd24d] to-[#f5b400] text-[#171717]">
            <Sparkles className="size-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-navy">Build an assessment from the question bank</p>
            <p className="text-xs text-slate-600">
              Pick a company, define sections by topic &amp; count - we auto-assemble it, preview, and schedule.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setWizardOpen(true)}
          className="shrink-0 rounded-full bg-gradient-to-r from-[#ffd24d] to-[#f5b400] px-5 py-2.5 text-sm font-extrabold text-[#171717]"
        >
          Build assessment
        </button>
      </div>

      {/* Cohort discoverability (#5): cohort CREATION (name, add students, import CSV)
          lives under Colleges, not here - the builder only PICKS an existing cohort. */}
      <Link
        href="/admin/colleges"
        className="flex items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-3.5 text-sm text-sky-900 transition-colors hover:bg-sky-100"
      >
        <span className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-600">
            <Users className="size-5" />
          </span>
          <span>
            <span className="font-bold">Create &amp; manage cohorts (batches)</span> — to assign an assessment to a group of
            students, first build a cohort (name, add students or import a CSV) under <span className="font-semibold">Colleges → open a college → Cohorts</span>, then pick it in the builder.
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 font-bold whitespace-nowrap">
          Manage cohorts <ArrowRight className="size-4" />
        </span>
      </Link>

      {/* Quick schedule (bind an existing mock) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-navy">
          <Plus className="size-4 text-[#f5b400]" /> Quick schedule (existing mock)
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1">
            <span className={labelCls}>Company</span>
            <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={inputCls}>
              <option value="">Select company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className={labelCls}>Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. TCS NQT - Round 1"
              className={inputCls}
            />
          </label>
          <label className="space-y-1">
            <span className={labelCls}>Mock test (optional)</span>
            <select value={mockTestId} onChange={(e) => setMockTestId(e.target.value)} className={inputCls}>
              <option value="">- none -</option>
              {mocks.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className={labelCls}>Date &amp; time</span>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="space-y-1">
            <span className={labelCls}>Duration (min)</span>
            <input
              type="number"
              min={5}
              max={600}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className={inputCls}
            />
          </label>
          <label className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              checked={proctored}
              onChange={(e) => setProctored(e.target.checked)}
              className="size-4 accent-[#f5b400]"
            />
            <span className="text-sm font-medium text-slate-600">Proctored</span>
          </label>
        </div>
        {err ? (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{err}</p>
        ) : null}
        <button
          type="button"
          onClick={create}
          disabled={creating}
          className="mt-4 flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ffd24d] to-[#f5b400] px-5 py-2.5 text-sm font-extrabold text-[#171717] disabled:opacity-60"
        >
          {creating ? <Loader2 className="size-4 animate-spin" /> : 'Schedule'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Filter</span>
        <select value={fCompany} onChange={(e) => setFCompany(e.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-navy focus:border-[#ffc42d] focus:outline-none">
          <option value="">All companies</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value as typeof fStatus)} className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-navy focus:border-[#ffc42d] focus:outline-none">
          <option value="all">Any status</option>
          <option value="upcoming">Upcoming</option>
          <option value="live">Live now</option>
          <option value="past">Past</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={fDuration} onChange={(e) => setFDuration(e.target.value as typeof fDuration)} className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-navy focus:border-[#ffc42d] focus:outline-none">
          <option value="all">Any duration</option>
          <option value="short">≤ 30 min</option>
          <option value="medium">31–90 min</option>
          <option value="long">&gt; 90 min</option>
        </select>
        {(fCompany || fStatus !== 'all' || fDuration !== 'all') ? (
          <button type="button" onClick={() => { setFCompany(''); setFStatus('all'); setFDuration('all'); }} className="text-xs font-bold text-[#1a1a1a] hover:underline">
            Clear
          </button>
        ) : null}
        {rows ? <span className="ml-auto text-xs font-medium text-slate-500">{filtered.length} of {rows.length}</span> : null}
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-slate-50/90">
            <tr className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              <th className="px-4 py-4">Assessment</th>
              <th className="px-4 py-4">Company</th>
              <th className="px-4 py-4">When</th>
              <th className="px-4 py-4">Duration</th>
              <th className="px-4 py-4">Proctored</th>
              <th className="px-4 py-4">Active</th>
              <th className="px-4 py-4" />
            </tr>
          </thead>
          <tbody>
            {rows === null ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <Loader2 className="mx-auto size-5 animate-spin text-slate-500" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-600">
                  {rows.length === 0 ? 'No assessments scheduled yet.' : 'No assessments match these filters.'}
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-t border-slate-100/80 hover:bg-slate-50/60">
                  <td className="px-4 py-3.5 font-semibold text-navy">{r.title}</td>
                  <td className="px-4 py-3.5 text-slate-600">{companyName[r.companyId] ?? r.companyName}</td>
                  <td className="px-4 py-3.5 text-slate-600">
                    {new Date(r.scheduledAt).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">{r.durationMinutes}m</td>
                  <td className="px-4 py-3.5">
                    {r.proctored ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6d5ef8]">
                        <Video className="size-3.5" /> Yes
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => toggleActive(r)}
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset disabled:opacity-50',
                        r.isActive
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                          : 'bg-slate-100 text-slate-600 ring-slate-200',
                      )}
                    >
                      {r.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEditWizardId(r.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        <Pencil className="size-3.5" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => openResults(r.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-[#6d5ef8] hover:bg-[#6d5ef8]/10"
                      >
                        <BarChart3 className="size-3.5" /> Results
                      </button>
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => remove(r.id)}
                        className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Results modal */}
      {resultsLoading || results ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setResults(null)}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          />
          <div className="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            {resultsLoading || !results ? (
              <div className="grid h-64 place-items-center">
                <Loader2 className="size-6 animate-spin text-slate-500" />
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-navy">{results.assessment.title}</h3>
                    <p className="text-xs text-slate-600">
                      {results.assessment.companyName} ·{' '}
                      {new Date(results.assessment.scheduledAt).toLocaleString([], {
                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResults(null)}
                    className="grid size-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 px-6 py-4 sm:grid-cols-5">
                  {[
                    { label: 'Registered', value: results.stats.registered },
                    { label: 'Attempted', value: results.stats.attempted },
                    { label: 'Avg score', value: `${results.stats.avgScorePct}%` },
                    { label: 'Top score', value: `${results.stats.topScorePct}%` },
                    { label: 'Flagged', value: results.stats.flagged },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                      <p className="text-xl font-black text-navy tabular-nums">{s.value}</p>
                      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
                  {results.rows.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-600">No attempts yet.</p>
                  ) : (
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-white">
                        <tr className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                          <th className="py-2">Student</th>
                          <th className="py-2">Score</th>
                          <th className="py-2">%ile</th>
                          <th className="py-2">Integrity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.rows.map((r) => (
                          <tr key={r.userId} className="border-t border-slate-100">
                            <td className="py-2.5">
                              <span className="block font-semibold text-navy">{r.fullName ?? r.email}</span>
                              <span className="text-[11px] text-slate-500">{r.email}</span>
                            </td>
                            <td className="py-2.5 font-semibold text-navy">
                              {r.score}/{r.total} <span className="text-slate-500">({r.scorePct}%)</span>
                            </td>
                            <td className="py-2.5 text-slate-600">{r.percentile}th</td>
                            <td className="py-2.5">
                              {r.violations > 0 ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                                  <ShieldAlert className="size-3.5" /> {r.tabSwitches}⇄ {r.fullscreenExits}⤢
                                </span>
                              ) : (
                                <span className="text-[11px] text-emerald-600">Clean</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const labelCls = 'text-[10px] font-bold uppercase tracking-widest text-slate-500';
const inputCls =
  'flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy transition-colors focus:border-[#ffc42d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffc42d]/30';
