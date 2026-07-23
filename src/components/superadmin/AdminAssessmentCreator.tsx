'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Code2, ListChecks, Loader2, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApiRequestError } from '@/lib/api/types';
import { listCompanies } from '@/lib/api/catalog';
import { listIndividualCohorts, type IndividualCohort } from '@/lib/api/individual-cohorts';
import {
  buildScheduledAssessment,
  getAdminCodingTopics,
  previewBuildAssessment,
  type BuildAvailability,
} from '@/lib/api/scheduling';
import { SectionTopicPicker } from '@/components/tpo/SectionTopicPicker';

const labelCls = 'text-[10px] font-bold uppercase tracking-widest text-slate-500';
const inputCls =
  'flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy transition-colors focus:border-[#ffc42d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffc42d]/30';

type CodingTopic = { topic: string; count: number };

/**
 * Admin assessment creator — the SAME bank-sampling flow the TPO Assessment Center
 * uses (mode → rounds → sections → coding topics → counts). Posts to the shared
 * admin build endpoint, which samples the bank and schedules the drive. An admin
 * drive can be company-wise, platform-wide, or targeted at a single individual
 * (non-college) cohort.
 */
export function AdminAssessmentCreator({ onCreated }: { onCreated: () => void }) {
  const [companies, setCompanies] = useState<{ slug: string; name: string }[]>([]);
  const [cohorts, setCohorts] = useState<IndividualCohort[]>([]);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState({
    mode: 'SECTIONAL' as 'SECTIONAL' | 'COMPANY',
    companySlug: '',
    title: '',
    scheduledAt: '',
    durationMinutes: '60',
    mcqCount: '20',
    codingCount: '0',
    difficulty: 'MIXED' as 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED',
    proctored: true,
    cohortId: '',
  });
  const [topicSel, setTopicSel] = useState<Set<string>>(new Set());
  const [codingTopics, setCodingTopics] = useState<CodingTopic[]>([]);
  const [codingSel, setCodingSel] = useState<Set<string>>(new Set());
  const [avail, setAvail] = useState<BuildAvailability | null>(null);

  const wantsMcq = (Number(form.mcqCount) || 0) > 0;
  const wantsCoding = (Number(form.codingCount) || 0) > 0;

  useEffect(() => {
    listCompanies()
      .then((cs) => setCompanies(cs.map((c) => ({ slug: c.slug, name: c.name }))))
      .catch(() => {});
    listIndividualCohorts()
      .then(setCohorts)
      .catch(() => {});
  }, []);

  // Coding topics for the picker — scoped to the chosen company (company mode) or the
  // whole coding bank (sectional). The admin-scoped endpoint mirrors the TPO one.
  useEffect(() => {
    const company = form.mode === 'COMPANY' && form.companySlug ? form.companySlug : undefined;
    getAdminCodingTopics(company)
      .then(setCodingTopics)
      .catch(() => setCodingTopics([]));
  }, [form.mode, form.companySlug]);

  // Live "questions available" for the current selection (debounced).
  useEffect(() => {
    if (form.mode === 'COMPANY' && !form.companySlug.trim()) {
      setAvail(null);
      return;
    }
    const t = setTimeout(() => {
      previewBuildAssessment({
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
  }, [form.mode, form.companySlug, form.difficulty, topicSel, codingSel]);

  const shortByMcq = !!avail && avail.mcqAvailable < (Number(form.mcqCount) || 0);
  const shortByCoding = !!avail && avail.codingAvailable < (Number(form.codingCount) || 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (form.title.trim().length < 2 || !form.scheduledAt) {
      setErr('Add a title (2+ characters) and a schedule time.');
      return;
    }
    const mcq = Number(form.mcqCount) || 0;
    const coding = Number(form.codingCount) || 0;
    if (mcq + coding < 1) {
      setErr('Add at least one round — turn on the MCQ round, the coding round, or both.');
      return;
    }
    if (form.mode === 'COMPANY' && !form.companySlug.trim()) {
      setErr('Pick a company for a company-wise assessment.');
      return;
    }
    setCreating(true);
    try {
      await buildScheduledAssessment({
        mode: form.mode,
        companySlug: form.mode === 'COMPANY' ? form.companySlug || undefined : undefined,
        title: form.title.trim(),
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMinutes: Number(form.durationMinutes),
        mcqCount: mcq,
        codingCount: coding || undefined,
        difficulty: form.difficulty,
        proctored: form.proctored,
        cohortId: form.cohortId || undefined,
        topicIds: topicSel.size > 0 ? [...topicSel] : undefined,
        codingTopics: codingSel.size > 0 ? [...codingSel] : undefined,
      });
      setForm((f) => ({ ...f, title: '', scheduledAt: '' }));
      setTopicSel(new Set());
      setCodingSel(new Set());
      onCreated();
    } catch (e2) {
      setErr(e2 instanceof ApiRequestError ? e2.message : 'Could not create assessment.');
    } finally {
      setCreating(false);
    }
  };

  const modeCompanies = useMemo(() => companies, [companies]);

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-navy">
        <Wand2 className="size-4 text-[#f5b400]" /> Create an assessment
        <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
          from the question bank
        </span>
      </h2>
      <p className="mt-1 text-xs text-slate-600">
        Choose a scope, turn on the MCQ and/or coding round, pick sections &amp; topics — we sample the bank,
        assemble the mock, and schedule it.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Scope */}
        <label className="space-y-1">
          <span className={labelCls}>Scope</span>
          <select
            value={form.mode}
            onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value as 'SECTIONAL' | 'COMPANY' }))}
            className={inputCls}
          >
            <option value="SECTIONAL">Sectional (broad bank)</option>
            <option value="COMPANY">Company-wise</option>
          </select>
        </label>
        {form.mode === 'COMPANY' && (
          <label className="space-y-1">
            <span className={labelCls}>Company</span>
            <select
              value={form.companySlug}
              onChange={(e) => setForm((f) => ({ ...f, companySlug: e.target.value }))}
              className={inputCls}
            >
              <option value="">Select company</option>
              {modeCompanies.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {/* Rounds */}
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
            Run MCQs, a technical coding round, or both — the coding round samples problems from the
            {form.mode === 'COMPANY' ? " company's" : ''} coding bank (Judge0-graded).
          </p>
        </div>

        {/* Sections (MCQ) */}
        {wantsMcq && (
          <div className="sm:col-span-2 lg:col-span-3">
            {form.mode === 'COMPANY' && (
              <p className="mb-1.5 text-[11px] font-medium text-slate-500">
                Optional — narrow the company&apos;s bank to specific sections/topics (leave empty for the whole bank).
              </p>
            )}
            <SectionTopicPicker selected={topicSel} onChange={setTopicSel} />
          </div>
        )}

        {/* Coding topics (chips) */}
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
                  <button
                    type="button"
                    onClick={() => setCodingSel(new Set())}
                    className="text-xs font-semibold text-[#1a1a1a] hover:underline"
                  >
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

        {/* Details */}
        <label className="space-y-1">
          <span className={labelCls}>Title</span>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="e.g. TCS NQT — Round 1"
            className={inputCls}
          />
        </label>
        <label className="space-y-1">
          <span className={labelCls}>Date &amp; time</span>
          <input
            type="datetime-local"
            value={form.scheduledAt}
            onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
            className={inputCls}
          />
        </label>
        <label className="space-y-1">
          <span className={labelCls}>Duration (min)</span>
          <input
            type="number"
            min={5}
            max={300}
            value={form.durationMinutes}
            onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
            className={inputCls}
          />
        </label>
        <label className="space-y-1">
          <span className={labelCls}>Cohort (optional)</span>
          <select
            value={form.cohortId}
            onChange={(e) => setForm((f) => ({ ...f, cohortId: e.target.value }))}
            className={inputCls}
          >
            <option value="">Everyone (no cohort)</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {wantsMcq && (
          <label className="space-y-1">
            <span className={labelCls}>MCQ count</span>
            <input
              type="number"
              min={1}
              max={100}
              value={form.mcqCount}
              onChange={(e) => setForm((f) => ({ ...f, mcqCount: e.target.value }))}
              className={inputCls}
            />
          </label>
        )}
        {wantsMcq && (
          <label className="space-y-1">
            <span className={labelCls}>MCQ difficulty</span>
            <select
              value={form.difficulty}
              onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value as typeof form.difficulty }))}
              className={inputCls}
            >
              <option value="MIXED">Mixed (all levels)</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </label>
        )}
        {wantsCoding && (
          <label className="space-y-1">
            <span className={labelCls}>Coding count</span>
            <input
              type="number"
              min={1}
              max={20}
              value={form.codingCount}
              onChange={(e) => setForm((f) => ({ ...f, codingCount: e.target.value }))}
              className={inputCls}
            />
          </label>
        )}
        <label className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            checked={form.proctored}
            onChange={(e) => setForm((f) => ({ ...f, proctored: e.target.checked }))}
            className="size-4 accent-[#f5b400]"
          />
          <span className="text-sm font-medium text-slate-600">Proctored</span>
        </label>

        {/* Availability */}
        {avail && (
          <div
            className={cn(
              'rounded-xl border px-3.5 py-2.5 text-xs sm:col-span-2 lg:col-span-3',
              shortByMcq || shortByCoding
                ? 'border-amber-300 bg-amber-50 text-amber-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700',
            )}
          >
            <span className="font-bold tabular-nums">{avail.mcqAvailable} MCQs</span> ·{' '}
            <span className="font-bold tabular-nums">{avail.codingAvailable} coding</span> questions available for this
            selection.
            {(shortByMcq || shortByCoding) && (
              <span className="mt-1 block font-semibold">
                You requested more than the bank has — the assessment will include only what&apos;s available. Lower the
                count or widen the scope.
              </span>
            )}
          </div>
        )}
      </div>

      {err ? (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700" role="alert">
          {err}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={creating}
        className="mt-4 flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ffd24d] to-[#f5b400] px-5 py-2.5 text-sm font-extrabold text-[#171717] disabled:opacity-60"
      >
        {creating ? <Loader2 className="size-4 animate-spin" /> : 'Create & schedule'}
      </button>
    </form>
  );
}
