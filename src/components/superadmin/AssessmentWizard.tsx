'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Check,
  CheckCircle2,
  Code2,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApiRequestError } from '@/lib/api/types';
import { listCompanies, listTopicsWithCounts, type ApiCompany, type ApiTopic } from '@/lib/api/catalog';
import { listAdminColleges, type AdminCollegeRow } from '@/lib/api/admin';
import { getCollegeCohorts } from '@/lib/api/admin-cohorts';
import { listIndividualCohorts, type IndividualCohort } from '@/lib/api/individual-cohorts';
import { HIDDEN_ROOT_SLUGS } from '@/components/practice/section-meta';
import type { CohortDto } from '@/shared';
import {
  createAssessment,
  generateOne,
  getEditableAssessment,
  listBuilderCodingTopics,
  sourceTopic,
  updateAssessment,
  type AssessmentItemType,
  type CodingTopic,
  type CreatedAssessment,
  type EditableAssessment,
} from '@/lib/api/assessment-builder';

const STEPS = ['Details', 'Questions', 'Review'];

/** Sentinel picker value → source N random problems across the whole coding bank. */
const ALL_CODING = '__ALL_CODING__';

/** Static category grouping for the coding picker (mirrors the practice taxonomy).
 *  Any topic not listed falls into "Other". */
const CODING_CATEGORY_GROUPS: Array<{ label: string; topics: string[] }> = [
  {
    label: 'Data Structures',
    topics: ['Arrays', 'Strings', 'Linked List', 'Stack', 'Queue', 'Heap', 'Hashing', 'Trees', 'Graphs', 'Matrix'],
  },
  {
    label: 'Algorithms',
    topics: ['Dynamic Programming', 'Greedy', 'Backtracking', 'Recursion', 'Searching', 'Sorting', 'Two Pointers', 'Sliding Window', 'Prefix Sum', 'Bit Manipulation'],
  },
  { label: 'Database', topics: ['SQL'] },
  { label: 'Math & Patterns', topics: ['Math', 'Number Series', 'Pattern Printing', 'Geometry'] },
];
const CODING_GROUP_ORDER = ['Data Structures', 'Algorithms', 'Database', 'Math & Patterns', 'Other'];

type CodingGroup = { label: string; options: CodingTopic[] };

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
interface ResolvedItem {
  key: string;
  topic: string;
  topicName: string;
  type: AssessmentItemType;
  difficulty: Difficulty;
  marks: number;
  count: number;
  ids: string[];
  fromBank: number;
  generated: number;
}
interface Section {
  name: string;
  items: ResolvedItem[];
}
interface GenState {
  sectionIdx: number;
  topic: string;
  type: AssessmentItemType;
  difficulty: Difficulty;
  marks: number;
  requested: number;
  phase: 'sourcing' | 'generating' | 'done' | 'error';
  bankCount: number;
  labels: string[];
  error?: string;
}

const labelCls = 'block text-[11px] font-bold uppercase tracking-widest text-slate-500';
const inputCls =
  'mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30';

const PLATFORM = '__platform__';

/** AI-assisted assessment builder wizard. Pass `editId` to edit an existing one.
 *  Pass `tpoCohorts` to run in TPO mode: the assessment is confined to the caller's own
 *  college (enforced server-side too), so the college picker + platform-wide option
 *  are hidden and cohorts come from the TPO's own list. */
export function AssessmentWizard({
  onClose,
  onCreated,
  editId,
  tpoCohorts,
}: {
  onClose: () => void;
  onCreated: () => void;
  editId?: string;
  tpoCohorts?: Array<{ id: string; name: string }>;
}) {
  const isTpo = !!tpoCohorts;
  const [step, setStep] = useState(0);
  const [companies, setCompanies] = useState<ApiCompany[]>([]);
  const [existing, setExisting] = useState<EditableAssessment | null>(null);

  // details
  const [companyId, setCompanyId] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [cohortId, setCohortId] = useState('');
  const [title, setTitle] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [proctored, setProctored] = useState(true);
  const [passingScore, setPassingScore] = useState(60);

  // pickers: MCQ taxonomy, coding tags, colleges + the selected college's cohorts
  const [topics, setTopics] = useState<ApiTopic[]>([]);
  const [codingTopics, setCodingTopics] = useState<CodingTopic[]>([]);
  const [colleges, setColleges] = useState<AdminCollegeRow[]>([]);
  const [cohorts, setCohorts] = useState<CohortDto[]>([]);
  const [individualCohorts, setIndividualCohorts] = useState<IndividualCohort[]>([]);

  // sections
  const [sections, setSections] = useState<Section[]>([{ name: 'Section 1', items: [] }]);
  const [gen, setGen] = useState<GenState | null>(null);

  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedAssessment | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    listCompanies().then(setCompanies).catch(() => {});
    listTopicsWithCounts().then(setTopics).catch(() => {});
    listBuilderCodingTopics().then(setCodingTopics).catch(() => {});
    if (!isTpo) {
      listAdminColleges().then(setColleges).catch(() => {});
      listIndividualCohorts().then(setIndividualCohorts).catch(() => {});
    }
  }, [isTpo]);

  // Load the selected college's cohorts (admin scope). TPO mode uses its own list.
  useEffect(() => {
    if (isTpo) return;
    if (!collegeId) {
      setCohorts([]);
      setCohortId('');
      return;
    }
    let alive = true;
    getCollegeCohorts(collegeId)
      .then((cs) => alive && setCohorts(cs))
      .catch(() => alive && setCohorts([]));
    return () => {
      alive = false;
    };
  }, [collegeId, isTpo]);

  /** Cohorts shown in the picker: the TPO's own list, or the selected college's. */
  const cohortOptions: Array<{ id: string; name: string }> = isTpo ? tpoCohorts ?? [] : cohorts;

  /** MCQ picker options grouped by section (root topic) - pick a whole section or a
   *  specific topic; the backend samples the whole subtree by id. */
  const topicGroups = useMemo(() => {
    const roots = topics.filter((t) => t.parentId === null && !HIDDEN_ROOT_SLUGS.has(t.slug) && (t.questionCount ?? 0) > 0);
    return roots
      .map((r) => ({
        label: r.name,
        options: [
          { id: r.id, name: `${r.name} - whole section`, count: r.questionCount ?? 0 },
          ...topics
            .filter((c) => c.parentId === r.id && (c.questionCount ?? 0) > 0)
            .map((c) => ({ id: c.id, name: c.name, count: c.questionCount ?? 0 })),
        ],
      }))
      .filter((g) => g.options.length > 0);
  }, [topics]);

  /** Coding picker options bucketed into the static categories (unmapped → Other),
   *  count-desc within each group (the endpoint already sorts by count desc). */
  const codingGroups = useMemo<CodingGroup[]>(() => {
    const topicToGroup = new Map<string, string>();
    for (const g of CODING_CATEGORY_GROUPS) for (const t of g.topics) topicToGroup.set(t, g.label);
    const buckets = new Map<string, CodingTopic[]>();
    for (const t of codingTopics) {
      const group = topicToGroup.get(t.topic) ?? 'Other';
      const list = buckets.get(group) ?? [];
      list.push(t);
      buckets.set(group, list);
    }
    return CODING_GROUP_ORDER.filter((g) => buckets.has(g)).map((g) => ({
      label: g,
      options: buckets.get(g) ?? [],
    }));
  }, [codingTopics]);

  const codingTotal = useMemo(() => codingTopics.reduce((a, t) => a + t.count, 0), [codingTopics]);

  // Edit mode: prefill from the existing assessment.
  useEffect(() => {
    if (!editId) return;
    const toLocal = (iso: string) => {
      const d = new Date(iso);
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    };
    getEditableAssessment(editId)
      .then((e) => {
        setExisting(e);
        setTitle(e.title);
        setCompanyId(e.companyId ?? PLATFORM);
        setStartAt(toLocal(e.scheduledAt));
        if (e.endsAt) setEndAt(toLocal(e.endsAt));
        setDurationMinutes(e.durationMinutes);
        setProctored(e.proctored);
        setPassingScore(e.passingScore);
      })
      .catch(() => {});
  }, [editId]);

  const totals = useMemo(() => {
    let mcq = 0;
    let coding = 0;
    for (const s of sections)
      for (const it of s.items) {
        if (it.type === 'MCQ') mcq += it.ids.length;
        else coding += it.ids.length;
      }
    return { mcq, coding, total: mcq + coding };
  }, [sections]);

  const detailsValid =
    title.trim().length >= 2 &&
    companyId &&
    startAt &&
    endAt &&
    new Date(endAt) > new Date(startAt) &&
    durationMinutes >= 5;

  // ── AI sourcing + live generation ────────────────────────────────────────────
  const runSource = async (
    sectionIdx: number,
    topic: string,
    type: AssessmentItemType,
    count: number,
    difficulty: Difficulty,
    marks: number,
    topicId?: string,
    allCoding?: boolean,
  ) => {
    setGen({ sectionIdx, topic, type, difficulty, marks, requested: count, phase: 'sourcing', bankCount: 0, labels: [] });
    try {
      const sourced = await sourceTopic(topic, type, count, { topicId, difficulty, allCoding });
      const ids = sourced.fromBank.map((b) => b.id);
      const labels = sourced.fromBank.map((b) => b.label);
      const willGen = sourced.aiAvailable ? sourced.toGenerate : 0;
      setGen((g) =>
        g ? { ...g, phase: willGen > 0 ? 'generating' : 'done', bankCount: ids.length, labels } : g,
      );
      for (let i = 0; i < willGen; i += 1) {
        const item = await generateOne({
          topicId: sourced.topicId,
          topicName: sourced.topicName,
          type,
          difficulty,
          avoid: labels.slice(-40),
        });
        ids.push(item.id);
        labels.push(item.label);
        setGen((g) => (g ? { ...g, labels: [...labels] } : g));
      }
      const resolved: ResolvedItem = {
        key: `${Date.now()}-${Math.round(performance.now())}`,
        topic,
        topicName: sourced.topicName,
        type,
        difficulty,
        marks,
        count,
        ids,
        fromBank: sourced.fromBank.length,
        generated: ids.length - sourced.fromBank.length,
      };
      setSections((prev) =>
        prev.map((s, i) => (i === sectionIdx ? { ...s, items: [...s.items, resolved] } : s)),
      );
      setGen((g) => (g ? { ...g, phase: 'done', labels } : g));
    } catch (e) {
      setGen((g) =>
        g
          ? { ...g, phase: 'error', error: e instanceof ApiRequestError ? e.message : 'Generation failed.' }
          : g,
      );
    }
  };

  const removeItem = (si: number, key: string) =>
    setSections((prev) =>
      prev.map((s, i) => (i === si ? { ...s, items: s.items.filter((it) => it.key !== key) } : s)),
    );

  const create = async () => {
    setCreating(true);
    setErr(null);
    try {
      // One payload section per topic-item so its marks (and difficulty mix) are preserved.
      const payloadSections = sections.flatMap((s) =>
        s.items.map((it) => ({
          name: `${s.name} · ${it.topicName}`,
          questionIds: it.type === 'MCQ' ? it.ids : [],
          codingProblemIds: it.type === 'CODING' ? it.ids : [],
          marksPerQuestion: it.marks,
        })),
      );
      const isPlatform = companyId === PLATFORM;
      const companyArg = isPlatform || !companyId ? undefined : companyId;
      if (editId) {
        const e = await updateAssessment(editId, {
          title: title.trim(),
          companyId: companyArg,
          platform: isPlatform,
          scheduledAt: new Date(startAt).toISOString(),
          endsAt: new Date(endAt).toISOString(),
          durationMinutes,
          proctored,
          passingScore,
          addSections: payloadSections,
        });
        setCreated({
          mockTestId: e.mockTestId ?? '',
          scheduledAssessmentId: e.id,
          totalQuestions: e.mcqCount + e.codingCount,
          mcqCount: e.mcqCount,
          codingCount: e.codingCount,
          companyName: isPlatform ? 'Platform-wide' : companies.find((c) => c.id === companyId)?.name ?? '',
        });
      } else {
        const result = await createAssessment({
          companyId: companyArg,
          collegeId: isTpo ? undefined : collegeId || undefined,
          cohortId: cohortId || undefined,
          title: title.trim(),
          scheduledAt: new Date(startAt).toISOString(),
          endsAt: new Date(endAt).toISOString(),
          durationMinutes,
          proctored,
          passingScore,
          sections: payloadSections,
        });
        setCreated(result);
      }
    } catch (e) {
      setErr(e instanceof ApiRequestError ? e.message : 'Could not save the assessment.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[#ffd24d] to-[#f5b400] text-[#171717]">
              <Wand2 className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-black text-navy">{editId ? 'Edit assessment' : 'Build an assessment'}</h2>
              <p className="text-[11px] text-slate-500">
                {editId ? 'Edit details + append question sections (pre-submission only)' : 'AI-sourced from your bank · generates the rest'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100">
            <X className="size-4" />
          </button>
        </div>

        {/* steps */}
        {!created ? (
          <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-3">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <span className={cn('grid size-6 place-items-center rounded-full text-[11px] font-bold', i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-orange text-[#171717]' : 'bg-slate-100 text-slate-500')}>
                  {i < step ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span className={cn('text-xs font-semibold', i === step ? 'text-navy' : 'text-slate-500')}>{s}</span>
                {i < STEPS.length - 1 ? <span className="mx-1 h-px w-6 bg-slate-200" /> : null}
              </div>
            ))}
          </div>
        ) : null}

        {/* body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {created ? (
            <div className="grid place-items-center py-10 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                <CheckCircle2 className="size-7" />
              </span>
              <h3 className="mt-4 text-lg font-black text-navy">Assessment published</h3>
              <p className="mt-1 text-sm text-slate-600">
                {created.totalQuestions} questions ({created.mcqCount} MCQ · {created.codingCount} coding) for{' '}
                {created.companyName}. It&apos;s now on the calendars of registered students.
              </p>
              <button type="button" onClick={() => { onCreated(); onClose(); }} className="mt-5 rounded-full bg-gradient-to-r from-[#ffd24d] to-[#f5b400] px-6 py-2.5 text-sm font-extrabold text-[#171717]">
                Done
              </button>
            </div>
          ) : step === 0 ? (
            <div className="space-y-4">
              <label className="block">
                <span className={labelCls}>Title</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="TCS NQT - Round 1" className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Audience</span>
                <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={inputCls}>
                  <option value="">Select audience</option>
                  {!isTpo && <option value={PLATFORM}>🌐 Platform-wide (all students)</option>}
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name} assessment</option>)}
                </select>
              </label>

              {/* Cohort-wise scope. TPO mode: confined to your own college (server-enforced),
                  so we only offer the cohort picker. Admin: college + cohort. */}
              {isTpo ? (
                <label className="block">
                  <span className={labelCls}>Cohort / batch (optional)</span>
                  <select value={cohortId} onChange={(e) => setCohortId(e.target.value)} className={inputCls}>
                    <option value="">All cohorts in your college</option>
                    {cohortOptions.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <span className="mt-1 block text-[11px] font-normal text-slate-500">
                    This assessment is limited to your college&apos;s students.
                  </span>
                </label>
              ) : (
                <div className="space-y-2">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className={labelCls}>College (optional)</span>
                      <select value={collegeId} onChange={(e) => setCollegeId(e.target.value)} className={inputCls}>
                        <option value="">All colleges</option>
                        {colleges.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className={labelCls}>Cohort / batch (optional)</span>
                      <select
                        value={cohortId}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCohortId(v);
                          // An individual cohort has no college - clear the college so the
                          // drive is scoped to just that cohort (server derives NULL college).
                          if (v && individualCohorts.some((c) => c.id === v)) setCollegeId('');
                        }}
                        className={inputCls}
                      >
                        <option value="">All (no specific cohort)</option>
                        {collegeId && cohortOptions.length > 0 ? (
                          <optgroup label="This college’s cohorts">
                            {cohortOptions.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </optgroup>
                        ) : null}
                        {individualCohorts.length > 0 ? (
                          <optgroup label="Individual cohorts (no college)">
                            {individualCohorts.map((c) => (
                              <option key={c.id} value={c.id}>{c.name} ({c.studentCount})</option>
                            ))}
                          </optgroup>
                        ) : null}
                      </select>
                    </label>
                  </div>
                  {/* Cohort creation lives elsewhere - point admins to both flows. */}
                  <p className="text-[11px] text-slate-500">
                    College batches: <span className="font-semibold text-navy">Admin → Colleges</span> → a college → Cohorts.{' '}
                    Groups of non-college users:{' '}
                    <a href="/admin/individual-cohorts" target="_blank" rel="noreferrer" className="font-semibold text-orange hover:underline">
                      Admin → Individual Cohorts →
                    </a>
                  </p>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className={labelCls}>Start time *</span>
                  <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className={inputCls} />
                </label>
                <label className="block">
                  <span className={labelCls}>End time *</span>
                  <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className={inputCls} />
                </label>
                <label className="block">
                  <span className={labelCls}>Duration (min) *</span>
                  <input type="number" min={5} max={600} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} className={inputCls} />
                </label>
              </div>
              {startAt && endAt && new Date(endAt) <= new Date(startAt) ? (
                <p className="text-xs font-semibold text-rose-600">End time must be after start time.</p>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className={labelCls}>Passing score (%)</span>
                  <input type="number" min={0} max={100} value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} className={inputCls} />
                </label>
                <label className="mt-5 flex items-center gap-2">
                  <input type="checkbox" checked={proctored} onChange={(e) => setProctored(e.target.checked)} className="size-4 accent-orange" />
                  <span className="text-sm font-medium text-slate-600">Proctored (camera + mic)</span>
                </label>
              </div>
            </div>
          ) : step === 1 ? (
            <div className="space-y-5">
              {existing ? (
                <div className="space-y-2">
                  {existing.editable ? (
                    <p className="rounded-xl border border-sky-200 bg-sky-50/60 px-4 py-2.5 text-xs text-sky-800">
                      Existing: <b>{existing.mcqCount + existing.codingCount}</b> question(s) ({existing.mcqCount} MCQ · {existing.codingCount} coding). New sections you add below are <b>appended</b>.
                    </p>
                  ) : (
                    <p className="rounded-xl border border-rose-200 bg-rose-50/60 px-4 py-2.5 text-xs font-semibold text-rose-700">
                      🔒 This assessment already has {existing.attempts} submission(s) - questions can no longer be changed. You can still cancel.
                    </p>
                  )}
                  {existing.items.length ? (
                    <div className="rounded-xl border border-slate-200 bg-white">
                      <p className="border-b border-slate-100 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Current questions ({existing.items.length})
                      </p>
                      <ul className="max-h-44 space-y-0.5 overflow-y-auto p-2">
                        {existing.items.map((it, i) => (
                          <li key={i} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-slate-50">
                            <span className={cn('grid size-5 shrink-0 place-items-center rounded', it.type === 'MCQ' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600')}>
                              {it.type === 'MCQ' ? <Brain className="size-3" /> : <Code2 className="size-3" />}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-slate-600">{it.label}</span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">{it.difficulty?.[0]}</span>
                            <span className="text-[10px] font-medium text-slate-500">{it.marks}m</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {sections.map((sec, si) => (
                <SectionEditor
                  key={si}
                  section={sec}
                  topicGroups={topicGroups}
                  codingGroups={codingGroups}
                  codingTotal={codingTotal}
                  onRename={(name) => setSections((p) => p.map((s, i) => (i === si ? { ...s, name } : s)))}
                  onAddTopic={(topic, type, count, difficulty, marks, topicId, allCoding) =>
                    runSource(si, topic, type, count, difficulty, marks, topicId, allCoding)
                  }
                  onRemoveItem={(key) => removeItem(si, key)}
                  onRemoveSection={sections.length > 1 ? () => setSections((p) => p.filter((_, i) => i !== si)) : undefined}
                />
              ))}
              <button
                type="button"
                onClick={() => setSections((p) => [...p, { name: `Section ${p.length + 1}`, items: [] }])}
                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:border-orange hover:text-[#1a1a1a]"
              >
                <Plus className="size-4" /> Add section
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <p className="text-sm font-black text-navy">{title || 'Untitled assessment'}</p>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] text-slate-600 sm:grid-cols-3">
                  <span>Company: <b className="text-navy">{companies.find((c) => c.id === companyId)?.name ?? '-'}</b></span>
                  <span>Duration: <b className="text-navy">{durationMinutes}m</b></span>
                  <span>Pass: <b className="text-navy">{passingScore}%</b></span>
                  <span>Start: <b className="text-navy">{startAt ? new Date(startAt).toLocaleString() : '-'}</b></span>
                  <span>End: <b className="text-navy">{endAt ? new Date(endAt).toLocaleString() : '-'}</b></span>
                  <span>Proctored: <b className="text-navy">{proctored ? 'Yes' : 'No'}</b></span>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1 rounded-2xl border border-slate-200 p-4 text-center">
                  <Brain className="mx-auto size-5 text-indigo-500" />
                  <p className="mt-1 text-2xl font-black text-navy">{totals.mcq}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">MCQ questions</p>
                </div>
                <div className="flex-1 rounded-2xl border border-slate-200 p-4 text-center">
                  <Code2 className="mx-auto size-5 text-emerald-500" />
                  <p className="mt-1 text-2xl font-black text-navy">{totals.coding}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Coding problems</p>
                </div>
              </div>
              {sections.filter((s) => s.items.length).map((s, i) => (
                <div key={i} className="rounded-xl border border-slate-100 p-3">
                  <p className="text-sm font-bold text-navy">{s.name}</p>
                  <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                    {s.items.map((it) => (
                      <li key={it.key}>· {it.topicName} - {it.ids.length} {it.type === 'MCQ' ? 'MCQ' : 'coding'} ({it.fromBank} bank + {it.generated} AI)</li>
                    ))}
                  </ul>
                </div>
              ))}
              {err ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{err}</p> : null}
            </div>
          )}
        </div>

        {/* footer */}
        {!created ? (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
            <button type="button" onClick={() => (step === 0 ? onClose() : setStep(step - 1))} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">
              <ArrowLeft className="size-4" /> {step === 0 ? 'Cancel' : 'Back'}
            </button>
            {step === 0 ? (
              <button type="button" disabled={!detailsValid} onClick={() => setStep(1)} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ffd24d] to-[#f5b400] px-5 py-2.5 text-sm font-extrabold text-[#171717] disabled:opacity-50">
                Next <ArrowRight className="size-4" />
              </button>
            ) : step === 1 ? (
              <button type="button" disabled={!editId && totals.total === 0} onClick={() => setStep(2)} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ffd24d] to-[#f5b400] px-5 py-2.5 text-sm font-extrabold text-[#171717] disabled:opacity-50">
                {editId ? 'Review changes' : `Review (${totals.total})`} <ArrowRight className="size-4" />
              </button>
            ) : (
              <button type="button" disabled={creating || (!editId && totals.total === 0) || (!!existing && !existing.editable)} onClick={create} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ffd24d] to-[#f5b400] px-5 py-2.5 text-sm font-extrabold text-[#171717] disabled:opacity-50">
                {creating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} {editId ? 'Save changes' : 'Publish assessment'}
              </button>
            )}
          </div>
        ) : null}
      </div>

      {/* Live AI generation modal */}
      <AnimatePresence>{gen ? <GenerationModal gen={gen} onClose={() => setGen(null)} /> : null}</AnimatePresence>
    </div>
  );
}

type TopicGroup = { label: string; options: Array<{ id: string; name: string; count: number }> };

/** Per-section editor: name + resolved items + the add-topic row. */
function SectionEditor({
  section,
  topicGroups,
  codingGroups,
  codingTotal,
  onRename,
  onAddTopic,
  onRemoveItem,
  onRemoveSection,
}: {
  section: Section;
  topicGroups: TopicGroup[];
  codingGroups: CodingGroup[];
  codingTotal: number;
  onRename: (name: string) => void;
  onAddTopic: (
    topic: string,
    type: AssessmentItemType,
    count: number,
    difficulty: Difficulty,
    marks: number,
    topicId?: string,
    allCoding?: boolean,
  ) => void;
  onRemoveItem: (key: string) => void;
  onRemoveSection?: () => void;
}) {
  const [mcqTopicId, setMcqTopicId] = useState('');
  const [codingSelection, setCodingSelection] = useState('');
  const [codingFilter, setCodingFilter] = useState('');
  const [type, setType] = useState<AssessmentItemType>('MCQ');
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [marks, setMarks] = useState(1);

  const mcqName = topicGroups.flatMap((g) => g.options).find((o) => o.id === mcqTopicId)?.name ?? '';
  const canAdd = type === 'MCQ' ? !!mcqTopicId : !!codingSelection;

  /** Client-side substring filter over topic names (the native <select> isn't type-ahead-searchable). */
  const filteredCodingGroups = useMemo<CodingGroup[]>(() => {
    const q = codingFilter.trim().toLowerCase();
    if (!q) return codingGroups;
    return codingGroups
      .map((g) => ({ ...g, options: g.options.filter((o) => o.topic.toLowerCase().includes(q)) }))
      .filter((g) => g.options.length > 0);
  }, [codingGroups, codingFilter]);

  const submit = () => {
    if (!canAdd) return;
    if (type === 'MCQ') {
      onAddTopic(mcqName, 'MCQ', count, difficulty, Math.max(1, marks), mcqTopicId);
      setMcqTopicId('');
    } else if (codingSelection === ALL_CODING) {
      onAddTopic('Whole Coding Section', 'CODING', count, difficulty, Math.max(1, marks), undefined, true);
      setCodingSelection('');
    } else {
      onAddTopic(codingSelection, 'CODING', count, difficulty, Math.max(1, marks));
      setCodingSelection('');
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-2">
        <input value={section.name} onChange={(e) => onRename(e.target.value)} className="w-40 rounded-lg border border-transparent px-1 text-sm font-black text-navy hover:border-slate-200 focus:border-orange focus:outline-none" />
        {onRemoveSection ? (
          <button type="button" onClick={onRemoveSection} className="text-slate-400 hover:text-rose-500"><Trash2 className="size-4" /></button>
        ) : null}
      </div>

      {/* resolved items */}
      {section.items.length ? (
        <div className="mt-3 space-y-1.5">
          {section.items.map((it) => (
            <div key={it.key} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 text-xs">
              <span className={cn('grid size-6 shrink-0 place-items-center rounded-md', it.type === 'MCQ' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600')}>
                {it.type === 'MCQ' ? <Brain className="size-3.5" /> : <Code2 className="size-3.5" />}
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold text-navy">{it.topicName}</span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">{it.difficulty[0]}</span>
              <span className="text-slate-500">{it.ids.length} {it.type === 'MCQ' ? 'Q' : 'coding'} · {it.marks}m · {it.fromBank}+{it.generated}AI</span>
              <button type="button" onClick={() => onRemoveItem(it.key)} className="text-slate-400 hover:text-rose-500"><X className="size-3.5" /></button>
            </div>
          ))}
        </div>
      ) : null}

      {/* add-topic row. Coding uses a TPO-style CHIPS picker (all topics + a prominent
          "Whole Coding Section" chip + search) instead of a buried dropdown. */}
      {type === 'CODING' ? (
        <div className="mt-3">
          <input
            value={codingFilter}
            onChange={(e) => setCodingFilter(e.target.value)}
            placeholder="Search coding topics (SQL, Trees, Graphs, DP, …)"
            aria-label="Search coding topics"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
          />
          <p className="mb-1.5 mt-2 text-[11px] font-semibold text-slate-500">
            Coding topics{' '}
            <span className="font-normal">
              · {codingSelection === ALL_CODING ? 'whole section (random mix)' : codingSelection ? codingSelection : 'pick a topic, or the whole section'}
            </span>
          </p>
          <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/40 p-2.5">
            <button
              type="button"
              onClick={() => setCodingSelection(ALL_CODING)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold transition-colors',
                codingSelection === ALL_CODING ? 'border-navy bg-navy text-white' : 'border-orange/40 bg-orange/5 text-orange hover:bg-orange/10',
              )}
            >
              <Sparkles className="size-3" /> Whole Coding Section · {codingTotal}
            </button>
            {filteredCodingGroups.flatMap((g) => g.options).map((o) => (
              <button
                key={o.topic}
                type="button"
                onClick={() => setCodingSelection(codingSelection === o.topic ? '' : o.topic)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                  codingSelection === o.topic ? 'border-orange bg-orange/10 text-orange' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                )}
              >
                {o.topic} <span className="text-[10px] opacity-60">{o.count}</span>
              </button>
            ))}
            {filteredCodingGroups.length === 0 ? (
              <span className="px-1 py-1 text-xs text-slate-400">No coding topics match your search.</span>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {type === 'MCQ' ? (
          <select
            value={mcqTopicId}
            onChange={(e) => setMcqTopicId(e.target.value)}
            title="Pick a section or topic - questions are pulled from the bank"
            className="h-10 min-w-[12rem] flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
          >
            <option value="">Select a section or topic…</option>
            {topicGroups.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.count})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        ) : null}
        <div className="inline-flex overflow-hidden rounded-lg border border-slate-200">
          {(['MCQ', 'CODING'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setType(t)} className={cn('px-3 py-2 text-xs font-bold', type === t ? 'bg-navy text-white' : 'bg-white text-slate-600')}>
              {t === 'MCQ' ? 'Quiz' : 'Coding'}
            </button>
          ))}
        </div>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          title="Difficulty"
          className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-navy focus:border-orange focus:outline-none"
        >
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>
        <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500" title="Number of questions">
          Qs
          <input type="number" min={1} max={50} value={count} onChange={(e) => setCount(Number(e.target.value))} className="h-10 w-14 rounded-lg border border-slate-200 bg-white px-2 text-sm text-navy focus:border-orange focus:outline-none" />
        </label>
        <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500" title="Marks per question">
          Marks
          <input type="number" min={1} max={20} value={marks} onChange={(e) => setMarks(Number(e.target.value))} className="h-10 w-14 rounded-lg border border-slate-200 bg-white px-2 text-sm text-navy focus:border-orange focus:outline-none" />
        </label>
        <button type="button" onClick={submit} disabled={!canAdd} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#ffd24d] to-[#f5b400] px-4 py-2 text-sm font-extrabold text-[#171717] disabled:opacity-50">
          <Wand2 className="size-4" /> Add
        </button>
      </div>
    </div>
  );
}

/** Live AI generation modal - bank items + each generated item streaming in. */
function GenerationModal({ gen, onClose }: { gen: GenState; onClose: () => void }) {
  const generatedCount = Math.max(0, gen.labels.length - gen.bankCount);
  const toGen = Math.max(0, gen.requested - gen.bankCount);
  const pct = gen.phase === 'done' ? 100 : toGen ? Math.round((generatedCount / toGen) * 100) : 100;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#6366f1] via-[#a855f7] to-[#ec4899] px-6 py-5 text-white">
          <div className="flex items-center gap-2.5">
            <motion.span animate={{ rotate: gen.phase === 'done' || gen.phase === 'error' ? 0 : 360 }} transition={{ duration: 3, repeat: gen.phase === 'done' || gen.phase === 'error' ? 0 : Infinity, ease: 'linear' }}>
              <Sparkles className="size-5" />
            </motion.span>
            <div>
              <p className="text-sm font-black">
                {gen.phase === 'sourcing' ? 'Searching the question bank…' : gen.phase === 'generating' ? 'Generating questions with AI…' : gen.phase === 'error' ? 'Generation failed' : 'Questions ready'}
              </p>
              <p className="text-[11px] text-white/80">{gen.topic} · {gen.type === 'MCQ' ? 'Quiz' : 'Coding'}</p>
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
            <motion.div className="h-full rounded-full bg-white" animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }} />
          </div>
          <p className="mt-1.5 text-[11px] font-semibold text-white/85">
            {gen.bankCount} from bank · {generatedCount}{toGen ? `/${toGen}` : ''} AI-generated
          </p>
        </div>

        <div className="max-h-64 overflow-y-auto p-4">
          {gen.error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{gen.error}</p>
          ) : (
            <ul className="space-y-1.5">
              {gen.labels.map((l, i) => (
                <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-2 text-xs">
                  <span className={cn('mt-0.5 grid size-4 shrink-0 place-items-center rounded-full', i < gen.bankCount ? 'bg-slate-200 text-slate-600' : 'bg-emerald-500 text-white')}>
                    {i < gen.bankCount ? <Check className="size-2.5" /> : <Sparkles className="size-2.5" />}
                  </span>
                  <span className="line-clamp-2 text-slate-600">{l}</span>
                </motion.li>
              ))}
              {(gen.phase === 'sourcing' || gen.phase === 'generating') ? (
                <li className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="size-3.5 animate-spin" /> working…</li>
              ) : null}
            </ul>
          )}
        </div>

        <div className="border-t border-slate-100 px-4 py-3 text-right">
          <button type="button" onClick={onClose} disabled={gen.phase === 'sourcing' || gen.phase === 'generating'} className="rounded-full bg-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-40">
            {gen.phase === 'done' ? 'Add to section' : gen.phase === 'error' ? 'Close' : 'Generating…'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
