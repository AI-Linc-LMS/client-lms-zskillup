'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Plus,
  Radio,
  Trash2,
  Users,
  Video,
  X,
} from 'lucide-react';
import {
  createTpoAssessment,
  deleteTpoAssessment,
  getTpoAssessmentResults,
  getTpoAssessments,
  previewTpoAssessment,
  releaseTpoAssessment,
} from '@/lib/api/tpo';
import { listCompanies } from '@/lib/api/catalog';
import type { AssessmentResults } from '@/lib/api/scheduling';
import type { TpoAssessment, TpoAssessmentAvailability, TpoAssessmentList, TpoAssessmentStatus } from '@/shared';
import { useTpoConsole } from '@/components/tpo/TpoConsole';
import { KpiCard } from '@/components/tpo/ui';
import { SectionTopicPicker } from '@/components/tpo/SectionTopicPicker';
import { Button } from '@/components/ui/button';

const STATUS_STYLE: Record<TpoAssessmentStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SCHEDULED: 'bg-sky-100 text-sky-700',
  LIVE: 'bg-emerald-100 text-emerald-700',
  COMPLETED: 'bg-violet-100 text-violet-700',
};

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange';

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function AssessmentCenterPage() {
  const { cohorts, cohortId } = useTpoConsole();
  const [data, setData] = useState<TpoAssessmentList | null>(null);
  const [companies, setCompanies] = useState<{ slug: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resultsFor, setResultsFor] = useState<TpoAssessment | null>(null);

  const [form, setForm] = useState({
    mode: 'SECTIONAL',
    companySlug: '',
    title: '',
    scheduledAt: '',
    durationMinutes: '60',
    mcqCount: '20',
    codingCount: '0',
    proctored: true,
    cohortId: '',
  });
  const [topicSel, setTopicSel] = useState<Set<string>>(new Set());
  const [avail, setAvail] = useState<TpoAssessmentAvailability | null>(null);

  // Live "questions available" for the current selection (debounced), so a drive is
  // never built blind or short of the requested count.
  useEffect(() => {
    if (!showForm || (form.mode === 'COMPANY' && !form.companySlug.trim())) {
      setAvail(null);
      return;
    }
    const t = setTimeout(() => {
      previewTpoAssessment({
        mode: form.mode,
        companySlug: form.mode === 'COMPANY' ? form.companySlug || undefined : undefined,
        topicIds: topicSel.size > 0 ? [...topicSel] : undefined,
      })
        .then(setAvail)
        .catch(() => setAvail(null));
    }, 400);
    return () => clearTimeout(t);
  }, [showForm, form.mode, form.companySlug, topicSel]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getTpoAssessments(cohortId || undefined)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load assessments'))
      .finally(() => setLoading(false));
  }, [cohortId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    // Lightweight company list for the datalist (public catalog), not the heavy
    // analytics payload.
    listCompanies()
      .then((cs) => setCompanies(cs.map((c) => ({ slug: c.slug, name: c.name }))))
      .catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.title.trim().length < 2 || !form.scheduledAt) {
      toast.error('Add a title (2+ characters) and a schedule time');
      return;
    }
    const mcq = Number(form.mcqCount);
    if (!Number.isFinite(mcq) || mcq < 1) {
      toast.error('MCQ count must be at least 1');
      return;
    }
    if (form.mode === 'COMPANY' && !form.companySlug.trim()) {
      toast.error('Pick a company for a company-wise assessment');
      return;
    }
    setSaving(true);
    try {
      await createTpoAssessment({
        mode: form.mode,
        companySlug: form.mode === 'COMPANY' ? form.companySlug || undefined : undefined,
        title: form.title.trim(),
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMinutes: Number(form.durationMinutes),
        mcqCount: Number(form.mcqCount),
        codingCount: Number(form.codingCount) || undefined,
        proctored: form.proctored,
        cohortId: form.cohortId || undefined,
        topicIds: topicSel.size > 0 ? [...topicSel] : undefined,
      });
      toast.success('Assessment created');
      setShowForm(false);
      setForm((f) => ({ ...f, title: '', scheduledAt: '' }));
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create assessment');
    } finally {
      setSaving(false);
    }
  }

  async function remove(a: TpoAssessment) {
    if (!confirm(`Delete "${a.title}"? This cannot be undone.`)) return;
    try {
      await deleteTpoAssessment(a.id);
      toast.success('Deleted');
      load();
    } catch {
      toast.error('Could not delete');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-7 animate-spin text-slate-400" />
      </div>
    );
  }
  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>;
  }

  const s = data?.stats;
  const capReached = (data?.activeCount ?? 0) >= (data?.activeCap ?? 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">
          Assessment Center · <span className="text-navy">{data?.activeCount ?? 0}/{data?.activeCap ?? 10} active</span>
        </p>
        <Button size="sm" onClick={() => setShowForm((v) => !v)} disabled={capReached}>
          <Plus className="size-4" /> Create Assessment
        </Button>
      </div>

      {capReached && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-700">
          You&apos;ve reached the limit of {data?.activeCap} active assessments. Complete or delete one to create more.
        </div>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard icon={ClipboardCheck} label="Total" value={s?.total ?? 0} tone="slate" />
        <KpiCard icon={CalendarClock} label="Upcoming" value={s?.upcoming ?? 0} tone="sky" />
        <KpiCard icon={Radio} label="Live" value={s?.live ?? 0} tone="emerald" />
        <KpiCard icon={CheckCircle2} label="Completed" value={s?.completed ?? 0} tone="violet" />
        <KpiCard icon={Users} label="Students Assigned" value={s?.studentsAssigned ?? 0} tone="orange" />
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs font-semibold text-slate-600">
            Mode
            <select value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))} className={`mt-1 ${inputCls}`}>
              <option value="SECTIONAL">Sectional-wise</option>
              <option value="COMPANY">Company-wise</option>
            </select>
          </label>
          {form.mode === 'COMPANY' && (
            <label className="text-xs font-semibold text-slate-600">
              Company
              <select
                value={form.companySlug}
                onChange={(e) => setForm((f) => ({ ...f, companySlug: e.target.value }))}
                className={`mt-1 ${inputCls}`}
              >
                <option value="">Select a company…</option>
                {companies.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[11px] font-normal text-slate-400">
                Questions are drawn from this company&apos;s pattern &amp; previous papers.
              </span>
            </label>
          )}
          <div className="sm:col-span-2 lg:col-span-3">
            {form.mode === 'COMPANY' && (
              <p className="mb-1.5 text-[11px] font-medium text-slate-400">
                Optional - narrow the company&apos;s bank to specific sections/topics (leave empty to use the whole bank).
              </p>
            )}
            <SectionTopicPicker selected={topicSel} onChange={setTopicSel} />
          </div>
          <label className="text-xs font-semibold text-slate-600 sm:col-span-2 lg:col-span-1">
            Title
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={`mt-1 ${inputCls}`} placeholder="e.g. TCS Mock - Round 1" required />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Date &amp; time
            <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))} className={`mt-1 ${inputCls}`} required />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Duration (min)
            <input type="number" min="5" max="300" value={form.durationMinutes} onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))} className={`mt-1 ${inputCls}`} />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Batch
            <select value={form.cohortId} onChange={(e) => setForm((f) => ({ ...f, cohortId: e.target.value }))} className={`mt-1 ${inputCls}`}>
              <option value="">All batches</option>
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            MCQ count
            <input type="number" min="1" max="100" value={form.mcqCount} onChange={(e) => setForm((f) => ({ ...f, mcqCount: e.target.value }))} className={`mt-1 ${inputCls}`} />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Coding count
            <input type="number" min="0" max="20" value={form.codingCount} onChange={(e) => setForm((f) => ({ ...f, codingCount: e.target.value }))} className={`mt-1 ${inputCls}`} />
          </label>
          <label className="flex items-center gap-2 pt-5 text-xs font-semibold text-slate-600">
            <input type="checkbox" checked={form.proctored} onChange={(e) => setForm((f) => ({ ...f, proctored: e.target.checked }))} />
            Proctored
          </label>
          {avail && (
            <div
              className={`rounded-xl border px-3.5 py-2.5 text-xs sm:col-span-2 lg:col-span-3 ${
                avail.mcqAvailable < (Number(form.mcqCount) || 0) || avail.codingAvailable < (Number(form.codingCount) || 0)
                  ? 'border-amber-300 bg-amber-50 text-amber-800'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              <span className="font-bold tabular-nums">{avail.mcqAvailable} MCQs</span> ·{' '}
              <span className="font-bold tabular-nums">{avail.codingAvailable} coding</span> questions available for this
              selection.
              {(avail.mcqAvailable < (Number(form.mcqCount) || 0) ||
                avail.codingAvailable < (Number(form.codingCount) || 0)) && (
                <span className="mt-1 block font-semibold">
                  You requested more than the bank has - the drive will include only what&apos;s available. Lower the
                  count or widen the scope.
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-3">
            <Button type="submit" size="sm" disabled={saving}>{saving ? 'Creating…' : 'Create & schedule'}</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {/* Scheduled table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-bold text-navy">Scheduled Assessments</h2>
        </div>
        {(data?.assessments.length ?? 0) === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-400">No assessments yet. Create your first drive above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-4 py-2.5">Assessment</th>
                  <th className="px-4 py-2.5">Company</th>
                  <th className="px-4 py-2.5">Assigned</th>
                  <th className="px-4 py-2.5">Attempted</th>
                  <th className="px-4 py-2.5">Date &amp; time</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data!.assessments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <p className="flex items-center gap-1.5 font-semibold text-navy">
                        {a.proctored && <Video className="size-3 text-[#f5b400]" />}
                        {a.title}
                      </p>
                      <p className="text-xs text-slate-400">{a.durationMinutes} min</p>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{a.companyName ?? 'Sectional'}</td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-600">{a.assigned}</td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-600">{a.attempted}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{fmtDateTime(a.scheduledAt)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[a.status]}`}>{a.status}</span>
                      {a.resultsReleased && <span className="ml-1 text-[10px] font-semibold text-emerald-600">· released</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setResultsFor(a)} className="text-slate-400 hover:text-navy" title="Results">
                          <BarChart3 className="size-4" />
                        </button>
                        <button type="button" onClick={() => remove(a)} className="text-slate-300 hover:text-red-500" title="Delete">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-400">
        Content is sampled from the question bank by mode. Templates, a calendar view, per-student custom
        assignment and auto-reminders are on the roadmap.
      </p>

      {resultsFor && <ResultsModal assessment={resultsFor} onClose={() => setResultsFor(null)} onReleased={load} />}
    </div>
  );
}

function ResultsModal({ assessment, onClose, onReleased }: { assessment: TpoAssessment; onClose: () => void; onReleased: () => void }) {
  const [results, setResults] = useState<AssessmentResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [released, setReleased] = useState(assessment.resultsReleased);

  useEffect(() => {
    getTpoAssessmentResults(assessment.id)
      .then(setResults)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [assessment.id]);

  async function release() {
    try {
      await releaseTpoAssessment(assessment.id);
      setReleased(true);
      toast.success('Results released to students');
      onReleased();
    } catch {
      toast.error('Could not release');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-navy/30 backdrop-blur-[2px]" />
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <h2 className="text-lg font-black text-navy">{assessment.title}</h2>
            <p className="text-xs text-slate-400">Results &amp; participation</p>
          </div>
          <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="size-5 animate-spin text-slate-400" /></div>
          ) : results ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Attempted" value={results.stats.attempted} />
                <Stat label="Avg score" value={`${results.stats.avgScorePct}%`} />
                <Stat label="Top score" value={`${results.stats.topScorePct}%`} />
                <Stat label="Flagged" value={results.stats.flagged} />
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full min-w-[420px] text-sm">
                  <thead className="bg-slate-50 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    <tr><th className="px-3 py-2">Student</th><th className="px-3 py-2">Score</th><th className="px-3 py-2">Status</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.rows.slice(0, 50).map((r) => (
                      <tr key={r.userId}>
                        <td className="px-3 py-2 font-medium text-navy">{r.fullName ?? r.email}</td>
                        <td className="px-3 py-2 tabular-nums text-slate-600">{r.scorePct}%</td>
                        <td className="px-3 py-2 text-xs text-slate-500">{r.status}</td>
                      </tr>
                    ))}
                    {results.rows.length === 0 && (
                      <tr><td colSpan={3} className="px-3 py-6 text-center text-slate-400">No submissions yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">Results unavailable.</p>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-4">
          {released ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600"><CheckCircle2 className="size-4" /> Results released</span>
          ) : (
            <Button size="sm" onClick={release}>Release results to students</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <p className="text-xl font-black tabular-nums text-navy">{value}</p>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
