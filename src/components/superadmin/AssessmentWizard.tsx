'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApiRequestError } from '@/lib/api/types';
import { listCompanies, listTopics, type ApiCompany, type ApiTopic } from '@/lib/api/catalog';
import {
  createAssessment,
  previewAssessment,
  type AssessmentPreview,
  type BuilderSection,
} from '@/lib/api/assessment-builder';

const STEPS = ['Details', 'Sections', 'Preview', 'Done'];

/** AI Linc-style assessment builder wizard (MCQ v1). */
export function AssessmentWizard({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [step, setStep] = useState(0);
  const [companies, setCompanies] = useState<ApiCompany[]>([]);
  const [topics, setTopics] = useState<ApiTopic[]>([]);

  // details
  const [companyId, setCompanyId] = useState('');
  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [proctored, setProctored] = useState(true);
  const [passingScore, setPassingScore] = useState(60);

  // sections
  const [sections, setSections] = useState<BuilderSection[]>([
    { name: 'Section 1', topicIds: [], numQuestions: 10, durationMinutes: 20 },
  ]);

  const [preview, setPreview] = useState<AssessmentPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    listCompanies().then(setCompanies).catch(() => {});
    listTopics().then(setTopics).catch(() => {});
  }, []);

  const topicLabel = useMemo(() => {
    const byId = new Map(topics.map((t) => [t.id, t]));
    return (id: string) => {
      const t = byId.get(id);
      if (!t) return id;
      const parent = t.parentId ? byId.get(t.parentId) : null;
      return parent ? `${parent.name} › ${t.name}` : t.name;
    };
  }, [topics]);

  const totalMinutes = sections.reduce((a, s) => a + (s.durationMinutes ?? 0), 0) || 60;
  const totalQuestions = sections.reduce((a, s) => a + s.numQuestions, 0);

  const updateSection = (i: number, patch: Partial<BuilderSection>) =>
    setSections((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const goPreview = async () => {
    setErr(null);
    if (sections.some((s) => s.topicIds.length === 0)) {
      setErr('Every section needs at least one topic.');
      return;
    }
    setBusy(true);
    try {
      setPreview(await previewAssessment(sections));
      setStep(2);
    } catch (e) {
      setErr(e instanceof ApiRequestError ? e.message : 'Could not build the preview.');
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    setErr(null);
    setBusy(true);
    try {
      await createAssessment({
        companyId,
        title: title.trim(),
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes: totalMinutes,
        proctored,
        passingScore,
        sections,
      });
      setStep(3);
    } catch (e) {
      setErr(e instanceof ApiRequestError ? e.message : 'Could not create the assessment.');
    } finally {
      setBusy(false);
    }
  };

  const detailsValid = companyId && title.trim().length >= 2 && scheduledAt;

  return (
    <div className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="relative my-4 h-fit w-full max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* header + steps */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[#f7a14e] to-[#f37021] text-white">
              <Sparkles className="size-5" />
            </span>
            <h2 className="text-lg font-extrabold text-navy">Build an assessment</h2>
          </div>
          <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 px-6 py-3">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <span
                className={cn(
                  'grid size-6 place-items-center rounded-full text-[11px] font-bold',
                  i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-orange text-white' : 'bg-slate-100 text-slate-400',
                )}
              >
                {i < step ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className={cn('text-xs font-semibold', i === step ? 'text-navy' : 'text-slate-400')}>{s}</span>
              {i < STEPS.length - 1 ? <span className="mx-1 h-px w-5 bg-slate-200" /> : null}
            </div>
          ))}
        </div>

        <div className="px-6 pb-6">
          {/* STEP 1 — details */}
          {step === 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company">
                <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={inputCls}>
                  <option value="">Select company</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Assessment title">
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. TCS NQT — Round 1" className={inputCls} />
              </Field>
              <Field label="Date & time">
                <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Pass mark (%)">
                <input type="number" min={0} max={100} value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} className={inputCls} />
              </Field>
              <label className="flex items-center gap-2 sm:col-span-2">
                <input type="checkbox" checked={proctored} onChange={(e) => setProctored(e.target.checked)} className="size-4 accent-orange" />
                <span className="text-sm font-medium text-slate-600">Proctored (camera + monitoring)</span>
              </label>
            </div>
          ) : null}

          {/* STEP 2 — sections */}
          {step === 1 ? (
            <div className="space-y-4">
              {sections.map((s, i) => (
                <SectionEditor
                  key={i}
                  index={i}
                  section={s}
                  topics={topics}
                  topicLabel={topicLabel}
                  onChange={(patch) => updateSection(i, patch)}
                  onRemove={sections.length > 1 ? () => setSections((p) => p.filter((_, idx) => idx !== i)) : undefined}
                />
              ))}
              <button
                type="button"
                onClick={() => setSections((p) => [...p, { name: `Section ${p.length + 1}`, topicIds: [], numQuestions: 10, durationMinutes: 20 }])}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50"
              >
                <Plus className="size-4" /> Add section
              </button>
              <p className="text-xs text-slate-500">
                Total: <strong>{totalQuestions}</strong> questions · ~{totalMinutes} min
              </p>
            </div>
          ) : null}

          {/* STEP 3 — preview */}
          {step === 2 && preview ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                The platform picked <strong>{preview.totalQuestions}</strong> questions from the bank
                across {preview.sections.length} section{preview.sections.length === 1 ? '' : 's'}.
              </p>
              {preview.sections.map((s, i) => (
                <div key={i} className="rounded-xl border border-slate-200 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-navy">{s.name}</span>
                    <span className={cn('text-xs font-bold', s.shortfall > 0 ? 'text-amber-600' : 'text-emerald-600')}>
                      {s.picked}/{s.requested} picked
                    </span>
                  </div>
                  {s.shortfall > 0 ? (
                    <p className="mt-1 text-[11px] text-amber-600">
                      Only {s.available} questions available in these topics — {s.shortfall} short.
                    </p>
                  ) : null}
                  {s.sample.length ? (
                    <ul className="mt-2 space-y-1 text-[11px] text-slate-500">
                      {s.sample.map((stem, j) => (
                        <li key={j} className="line-clamp-1">• {stem}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {/* STEP 4 — done */}
          {step === 3 ? (
            <div className="py-8 text-center">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260 }}
                className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-600"
              >
                <CheckCircle2 className="size-8" />
              </motion.span>
              <h3 className="mt-4 text-lg font-extrabold text-navy">Assessment created &amp; scheduled</h3>
              <p className="mt-1 text-sm text-slate-500">
                It&apos;s live — every registered student sees it on their calendar and gets notified.
              </p>
              <button
                type="button"
                onClick={() => { onCreated(); onClose(); }}
                className="mt-5 rounded-full bg-gradient-to-r from-[#f7a14e] to-[#f37021] px-6 py-2.5 text-sm font-extrabold text-white"
              >
                Done
              </button>
            </div>
          ) : null}

          {err ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{err}</p> : null}

          {/* nav */}
          {step < 3 ? (
            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                <ArrowLeft className="size-4" /> {step === 0 ? 'Cancel' : 'Back'}
              </button>
              {step === 0 ? (
                <NavBtn disabled={!detailsValid} onClick={() => setStep(1)}>Next: Sections</NavBtn>
              ) : step === 1 ? (
                <NavBtn disabled={busy} onClick={goPreview}>{busy ? 'Building…' : 'Preview'}</NavBtn>
              ) : (
                <NavBtn disabled={busy} onClick={create}>{busy ? 'Creating…' : 'Create & publish'}</NavBtn>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SectionEditor({
  index,
  section,
  topics,
  topicLabel,
  onChange,
  onRemove,
}: {
  index: number;
  section: BuilderSection;
  topics: ApiTopic[];
  topicLabel: (id: string) => string;
  onChange: (patch: Partial<BuilderSection>) => void;
  onRemove?: () => void;
}) {
  const [q, setQ] = useState('');
  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return topics
      .filter((t) => !section.topicIds.includes(t.id))
      .filter((t) => !needle || t.name.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [q, topics, section.topicIds]);

  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <input
          value={section.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="rounded-lg border border-transparent px-1 text-sm font-bold text-navy hover:border-slate-200 focus:border-orange focus:outline-none"
        />
        {onRemove ? (
          <button type="button" onClick={onRemove} className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600">
            <Trash2 className="size-4" />
          </button>
        ) : null}
      </div>

      {/* selected topics */}
      {section.topicIds.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {section.topicIds.map((id) => (
            <span key={id} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
              {topicLabel(id)}
              <button type="button" onClick={() => onChange({ topicIds: section.topicIds.filter((t) => t !== id) })}>
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {/* topic search */}
      <div className="relative mt-2">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search topics to add…"
          className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-navy focus:border-orange focus:outline-none"
        />
        {q.trim() && matches.length ? (
          <div className="absolute z-10 mt-1 max-h-44 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
            {matches.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { onChange({ topicIds: [...section.topicIds, t.id] }); setQ(''); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50"
              >
                <Plus className="size-3 text-orange" /> {topicLabel(t.id)}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Field label="Questions">
          <input type="number" min={1} max={100} value={section.numQuestions} onChange={(e) => onChange({ numQuestions: Number(e.target.value) })} className={inputCls} />
        </Field>
        <Field label="Marks/Q">
          <input type="number" min={1} max={20} value={section.marksPerQuestion ?? 1} onChange={(e) => onChange({ marksPerQuestion: Number(e.target.value) })} className={inputCls} />
        </Field>
        <Field label="Minutes">
          <input type="number" min={1} max={300} value={section.durationMinutes ?? 20} onChange={(e) => onChange({ durationMinutes: Number(e.target.value) })} className={inputCls} />
        </Field>
      </div>
      <span className="sr-only">Section {index + 1}</span>
    </div>
  );
}

const inputCls =
  'flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function NavBtn({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#f7a14e] to-[#f37021] px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_10px_24px_-10px_rgba(243,112,33,0.8)] disabled:opacity-50"
    >
      {disabled ? <Loader2 className="hidden size-4 animate-spin" /> : null}
      {children} <ArrowRight className="size-4" />
    </button>
  );
}
