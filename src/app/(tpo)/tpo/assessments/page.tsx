'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Code2,
  ListChecks,
  Loader2,
  Plus,
  Radio,
  Send,
  Sparkles,
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
  getTpoCodingTopics,
  previewTpoAssessment,
  publishTpoAssessment,
  releaseTpoAssessment,
} from '@/lib/api/tpo';
import { listCompanies } from '@/lib/api/catalog';
import type { CodingTopic } from '@/lib/api/mocks';
import type { AssessmentResults } from '@/lib/api/scheduling';
import type { TpoAssessment, TpoAssessmentAvailability, TpoAssessmentList, TpoAssessmentStatus } from '@/shared';
import { useTpoConsole } from '@/components/tpo/TpoConsole';
import { ResultsReport } from '@/components/assessment/ResultsReport';
import { KpiCard } from '@/components/tpo/ui';
import { SectionTopicPicker } from '@/components/tpo/SectionTopicPicker';
import { AssessmentWizard } from '@/components/superadmin/AssessmentWizard';
import { Button } from '@/components/ui/button';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { cn } from '@/lib/utils';

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
  const [aiWizard, setAiWizard] = useState(false);
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
    difficulty: 'MIXED',
    proctored: true,
    cohortId: '',
  });
  const [topicSel, setTopicSel] = useState<Set<string>>(new Set());
  const [codingTopics, setCodingTopics] = useState<CodingTopic[]>([]);
  const [codingSel, setCodingSel] = useState<Set<string>>(new Set());
  const [avail, setAvail] = useState<TpoAssessmentAvailability | null>(null);
  const wantsCoding = (Number(form.codingCount) || 0) > 0;
  const wantsMcq = (Number(form.mcqCount) || 0) > 0;

  // Coding topics (primary tags) for the picker - scoped to the chosen company in
  // company mode, else the whole coding bank (sectional mode). Refetch on scope change.
  // Uses the TPO-scoped endpoint (the student /mocks/coding-topics is STUDENT-only,
  // so a COLLEGE_ADMIN got a 403 and the list silently came back empty).
  useEffect(() => {
    const company = form.mode === 'COMPANY' && form.companySlug ? form.companySlug : undefined;
    getTpoCodingTopics(company)
      .then(setCodingTopics)
      .catch(() => setCodingTopics([]));
  }, [form.mode, form.companySlug]);

  // Live "questions available" for the current selection (debounced), so an assessment is
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
        codingTopics: codingSel.size > 0 ? [...codingSel] : undefined,
        difficulty: form.difficulty,
      })
        .then(setAvail)
        .catch(() => setAvail(null));
    }, 400);
    return () => clearTimeout(t);
  }, [showForm, form.mode, form.companySlug, topicSel, codingSel]);

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
    const mcq = Number(form.mcqCount) || 0;
    const coding = Number(form.codingCount) || 0;
    if (mcq + coding < 1) {
      toast.error('Add at least one round - turn on the MCQ round, the coding round, or both');
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
        difficulty: form.difficulty,
        proctored: form.proctored,
        cohortId: form.cohortId || undefined,
        topicIds: topicSel.size > 0 ? [...topicSel] : undefined,
        codingTopics: codingSel.size > 0 ? [...codingSel] : undefined,
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

  const [publishingId, setPublishingId] = useState<string | null>(null);
  async function publish(a: TpoAssessment) {
    if (!confirm(`Publish "${a.title}" and email every assigned student a link?`)) return;
    setPublishingId(a.id);
    try {
      await publishTpoAssessment(a.id);
      toast.success('Published - students notified');
      load();
    } catch {
      toast.error('Could not publish');
    } finally {
      setPublishingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-7 animate-spin text-slate-500" />
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
      <ConsoleHero
        icon={ClipboardCheck}
        eyebrow="Placement Office"
        title="Assessment Center"
        description="Schedule proctored MCQ and coding assessments for your batches, then release results to students."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/70 ring-1 ring-inset ring-white/15">
              {data?.activeCount ?? 0}/{data?.activeCap ?? 10} active
            </span>
            <Button size="sm" variant="outline" onClick={() => setAiWizard(true)} disabled={capReached}>
              <Sparkles className="size-4" /> Build with AI
            </Button>
            <Button size="sm" onClick={() => setShowForm((v) => !v)} disabled={capReached}>
              <Plus className="size-4" /> Create Assessment
            </Button>
          </div>
        }
      />

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
              <span className="mt-1 block text-[11px] font-normal text-slate-500">
                Questions are drawn from this company&apos;s pattern &amp; previous papers.
              </span>
            </label>
          )}
          {/* Assessment rounds - MCQ and/or a technical coding round. Coding used to be
              hidden behind the count field defaulting to 0; make it a first-class,
              discoverable choice for BOTH sectional and company-wise assessments. */}
          <div className="sm:col-span-2 lg:col-span-3">
            <span className="text-xs font-semibold text-slate-600">Assessment rounds</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={wantsMcq}
                onClick={() => setForm((f) => ({ ...f, mcqCount: wantsMcq ? '0' : '20' }))}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition',
                  wantsMcq
                    ? 'border-[#ffc42d] bg-[#fff5ea] text-[#1a1a1a]'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300',
                )}
              >
                <ListChecks className="size-4" /> MCQ round
                {wantsMcq && <CheckCircle2 className="size-3.5 text-emerald-600" />}
              </button>
              <button
                type="button"
                aria-pressed={wantsCoding}
                onClick={() => setForm((f) => ({ ...f, codingCount: wantsCoding ? '0' : '2' }))}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition',
                  wantsCoding
                    ? 'border-[#ffc42d] bg-[#fff5ea] text-[#1a1a1a]'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300',
                )}
              >
                <Code2 className="size-4" /> Coding round
                {wantsCoding && <CheckCircle2 className="size-3.5 text-emerald-600" />}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              Run MCQs, a technical coding round, or both - a coding round samples problems from the
              {form.mode === 'COMPANY' ? " company's" : ''} coding bank (Judge0-graded), for both sectional and company-wise assessments.
            </p>
          </div>

          {wantsMcq && (
            <div className="sm:col-span-2 lg:col-span-3">
              {form.mode === 'COMPANY' && (
                <p className="mb-1.5 text-[11px] font-medium text-slate-500">
                  Optional - narrow the company&apos;s bank to specific sections/topics (leave empty to use the whole bank).
                </p>
              )}
              <SectionTopicPicker selected={topicSel} onChange={setTopicSel} />
            </div>
          )}

          {/* Coding topics - only when the assessment includes coding questions. Scopes
              which coding topics (tags) the coding problems are sampled from. */}
          {wantsCoding && (
            <div className="sm:col-span-2 lg:col-span-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">
                    Coding topics{' '}
                    <span className="font-normal text-slate-500">
                      · {codingSel.size ? `${codingSel.size} selected` : 'all coding topics (leave empty to mix)'}
                    </span>
                  </span>
                  {codingSel.size > 0 && (
                    <button type="button" onClick={() => setCodingSel(new Set())} className="text-xs font-semibold text-[#1a1a1a] hover:underline">
                      Clear
                    </button>
                  )}
                </div>
                {codingTopics.length === 0 ? (
                  <p className="py-3 text-center text-xs text-slate-500">No coding topics available for this scope.</p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {codingTopics.map((t) => {
                      const on = codingSel.has(t.topic);
                      return (
                        <button
                          key={t.topic}
                          type="button"
                          onClick={() =>
                            setCodingSel((prev) => {
                              const next = new Set(prev);
                              if (next.has(t.topic)) next.delete(t.topic);
                              else next.add(t.topic);
                              return next;
                            })
                          }
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition',
                            on
                              ? 'border-[#ffc42d] bg-[#fff5ea] text-[#1a1a1a]'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                          )}
                        >
                          {t.topic}
                          <span className="text-[10px] text-slate-400">{t.count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
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
          {wantsMcq && (
            <label className="text-xs font-semibold text-slate-600">
              MCQ count
              <input type="number" min="1" max="100" value={form.mcqCount} onChange={(e) => setForm((f) => ({ ...f, mcqCount: e.target.value }))} className={`mt-1 ${inputCls}`} />
            </label>
          )}
          {wantsMcq && (
            <label className="text-xs font-semibold text-slate-600">
              MCQ difficulty
              <select value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))} className={`mt-1 ${inputCls}`}>
                <option value="MIXED">Mixed (all levels)</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </label>
          )}
          {wantsCoding && (
            <label className="text-xs font-semibold text-slate-600">
              Coding count
              <input type="number" min="1" max="20" value={form.codingCount} onChange={(e) => setForm((f) => ({ ...f, codingCount: e.target.value }))} className={`mt-1 ${inputCls}`} />
            </label>
          )}
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
                  You requested more than the bank has - the assessment will include only what&apos;s available. Lower the
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
          <p className="px-5 py-10 text-center text-sm text-slate-500">No assessments yet. Create your first assessment above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-500">
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
                      <p className="text-xs text-slate-500">{a.durationMinutes} min</p>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{a.companyName ?? 'Sectional'}</td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-600">{a.assigned}</td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-600">{a.attempted}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">{fmtDateTime(a.scheduledAt)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[a.status]}`}>{a.status}</span>
                      {a.resultsReleased && <span className="ml-1 text-[10px] font-semibold text-emerald-600">· released</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => publish(a)}
                          disabled={publishingId === a.id}
                          className="text-slate-500 transition-colors hover:text-orange disabled:opacity-50"
                          title="Publish & notify students"
                        >
                          {publishingId === a.id ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                        </button>
                        <button type="button" onClick={() => setResultsFor(a)} className="text-slate-500 hover:text-navy" title="Results">
                          <BarChart3 className="size-4" />
                        </button>
                        <button type="button" onClick={() => remove(a)} className="text-slate-400 hover:text-red-500" title="Delete">
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

      <p className="text-[11px] text-slate-500">
        Content is sampled from the question bank by mode. Templates, a calendar view, per-student custom
        assignment and auto-reminders are on the roadmap.
      </p>

      {resultsFor && <ResultsModal assessment={resultsFor} onClose={() => setResultsFor(null)} onReleased={load} />}

      {aiWizard && (
        <AssessmentWizard
          tpoCohorts={cohorts.map((c) => ({ id: c.id, name: c.name }))}
          onClose={() => setAiWizard(false)}
          onCreated={() => {
            setAiWizard(false);
            load();
          }}
        />
      )}
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
      <div className="relative flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <h2 className="text-lg font-black text-navy">{assessment.title}</h2>
            <p className="text-xs text-slate-500">Cohort-wise results &amp; participation</p>
          </div>
          <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
            <X className="size-4" />
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="size-5 animate-spin text-slate-500" /></div>
        ) : results ? (
          <ResultsReport data={results} />
        ) : (
          <p className="py-8 text-center text-sm text-slate-500">Results unavailable.</p>
        )}
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
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}
