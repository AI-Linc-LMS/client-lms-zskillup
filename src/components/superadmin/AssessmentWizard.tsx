'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Lock, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { listCompanies, listTopicsWithCounts, type ApiCompany, type ApiTopic } from '@/lib/api/catalog';
import {
  listAdminColleges,
  previewQuestions,
  type AdminCollegeRow,
  type AdminQuestionPreview,
} from '@/lib/api/admin';
import { previewAdminCodingProblems } from '@/lib/api/coding';
import { getCollegeCohorts } from '@/lib/api/admin-cohorts';
import { listIndividualCohorts, type IndividualCohort } from '@/lib/api/individual-cohorts';
import { describeApiError } from '@/lib/api/types';
import { parseSelectionError, type SelectionError } from '@/lib/api/question-selection-errors';
import type { CohortDto } from '@/shared';
import type { AdminCodingProblemPreviewDto } from '@/shared/dto/admin-coding-search.dto';
import {
  createAssessment,
  getEditableAssessment,
  listBuilderCodingTopics,
  updateAssessment,
  type AssessmentItemType,
  type CodingTopic,
  type CreatedAssessment,
  type EditableAssessment,
  type EditedAssessment,
  type SelectionIdLists,
} from '@/lib/api/assessment-builder';
import { DialogShell } from './assessment-wizard/DialogShell';
import { ConfirmPublishDialog } from './assessment-wizard/ConfirmPublishDialog';
import { ReviewStep, SelectionErrorPanel } from './assessment-wizard/ReviewStep';
import { SectionEditor, type SelectionMode } from './assessment-wizard/SectionEditor';
import { SelectionSummary } from './assessment-wizard/SelectionSummary';
import { buildTopicOptions } from './assessment-wizard/topic-tree';
import {
  LIMITS,
  applySectionEdit,
  newSection,
  normId,
  paperMarks,
  removeIds,
  selectionProblems,
  takenIds as collectTakenIds,
  tallySelection,
  toPayloadSections,
  type SectionEdit,
  type SectionUpdater,
  type WizardSection,
} from './assessment-wizard/selection';
import { ErrorAlert, NoticeBox, checkboxCls, eyebrowCls, fieldLabelCls, inputCls } from './assessment-wizard/ui';

const STEPS = ['Details', 'Questions', 'Review'] as const;
const PLATFORM = '__platform__';

const chunk = <T,>(list: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Ids a non-strict server left out. The wizard always sends strictDuplicates, so this is
 *  expected to be 0 — but if a server ever reports some, say so rather than hide it. */
const leftOut = (...lists: Array<SelectionIdLists | undefined>) =>
  lists.reduce((n, l) => n + (l ? l.questionIds.length + l.codingProblemIds.length : 0), 0);

/**
 * Assessment wizard (Details → Questions → Review). Every question is chosen explicitly —
 * drawn at random from the bank for review, or picked by hand — and the exact ids are
 * published ("fixed"); nothing is re-sampled at publish time.
 *
 * Pass `editId` to edit an existing assessment (details + append sections). Pass
 * `tpoCohorts` to run in TPO mode: confined to the caller's college (server-enforced), no
 * college picker / platform-wide option, and no manual browsing (admin-only endpoints).
 */
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
  const titleId = useId();
  const [step, setStep] = useState(0);
  const [companies, setCompanies] = useState<ApiCompany[]>([]);
  const [existing, setExisting] = useState<EditableAssessment | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  // details
  const [companyId, setCompanyId] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [cohortId, setCohortId] = useState('');
  const [title, setTitle] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [proctored, setProctored] = useState(true);
  const [proctorAutoSubmit, setProctorAutoSubmit] = useState(false);
  const [proctorMaxWarnings, setProctorMaxWarnings] = useState(3);
  const [subscriptionLock, setSubscriptionLock] = useState(true);
  const [profileLock, setProfileLock] = useState(false);
  const [passingScore, setPassingScore] = useState(60);

  // pickers
  const [topics, setTopics] = useState<ApiTopic[]>([]);
  const [codingTopics, setCodingTopics] = useState<CodingTopic[]>([]);
  const [colleges, setColleges] = useState<AdminCollegeRow[]>([]);
  const [cohorts, setCohorts] = useState<CohortDto[]>([]);
  const [individualCohorts, setIndividualCohorts] = useState<IndividualCohort[]>([]);

  // questions
  const [sections, setSections] = useState<WizardSection[]>(() => [newSection(1)]);
  /** The newest selection, ahead of React's render: draws, fills and AI items land after an
   *  await, so they must be checked against what is selected NOW, not at click time. Every
   *  write goes through `mutateSections` / `updateSection`, which keep this in step. */
  const latestSections = useRef(sections);
  /** Draws / fills / re-draws / AI runs still in flight — Review and Publish wait for them. */
  const [inFlight, setInFlight] = useState(0);
  /** Which section's "Add questions" panel is open; undefined = the default (first section). */
  const [openPanel, setOpenPanel] = useState<string | null | undefined>(undefined);
  const [modes, setModes] = useState<Record<string, SelectionMode>>({});
  const [itemTypes, setItemTypes] = useState<Record<string, AssessmentItemType>>({});

  // review previews (admin-only endpoints)
  const [mcqPreview, setMcqPreview] = useState<Record<string, AdminQuestionPreview>>({});
  const [codingPreview, setCodingPreview] = useState<Record<string, AdminCodingProblemPreviewDto>>({});
  const [missingIds, setMissingIds] = useState<Set<string>>(new Set());
  const [previewPending, setPreviewPending] = useState(0);
  const [previewError, setPreviewError] = useState<string | null>(null);
  /** Bumped by "Retry" so the preview effect runs again for the ids that failed. */
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const requestedPreview = useRef(new Set<string>());

  // publish
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedAssessment | null>(null);
  const [saved, setSaved] = useState<EditedAssessment | null>(null);
  const [selErr, setSelErr] = useState<SelectionError | null>(null);

  const canPreview = !isTpo;

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

  const cohortOptions: Array<{ id: string; name: string }> = isTpo ? tpoCohorts ?? [] : cohorts;

  // Edit mode: prefill from the existing assessment.
  useEffect(() => {
    if (!editId) return;
    getEditableAssessment(editId)
      .then((e) => {
        setExisting(e);
        setTitle(e.title);
        setCompanyId(e.companyId ?? PLATFORM);
        setStartAt(toLocalInput(e.scheduledAt));
        if (e.endsAt) setEndAt(toLocalInput(e.endsAt));
        setDurationMinutes(e.durationMinutes);
        setProctored(e.proctored);
        setProctorAutoSubmit(e.proctorAutoSubmit ?? false);
        setProctorMaxWarnings(e.proctorMaxWarnings ?? 3);
        setSubscriptionLock(e.subscriptionLockEnabled);
        setProfileLock(e.profileLockEnabled);
        setPassingScore(e.passingScore);
      })
      .catch((e: unknown) => setLoadErr(describeApiError(e, 'Could not load this assessment.')));
  }, [editId]);

  const topicOptions = useMemo(() => buildTopicOptions(topics), [topics]);
  const companyBySlug = useMemo(() => new Map(companies.map((c) => [c.slug, c.name])), [companies]);
  const companyName = useCallback((slug: string) => companyBySlug.get(slug) ?? slug, [companyBySlug]);
  const driveCompanySlug = companies.find((c) => c.id === companyId)?.slug ?? '';
  const existingItems = useMemo(() => existing?.items ?? [], [existing]);
  const latestExisting = useRef(existingItems);
  useEffect(() => {
    latestExisting.current = existingItems;
  }, [existingItems]);
  const locked = !!existing && !existing.editable;
  /**
   * Attempts froze the drive, but its CLOSING time can still move (the server allows a
   * patch whose only real change is `endsAt`). So the wizard keeps exactly that one field
   * live, greys out the rest, and — critically — sends ONLY the date, so a value the admin
   * never touched can't count as a change and bounce the save.
   *
   * `deadlineEditable` is absent on a server that predates the rule; then the drive stays
   * fully locked rather than offering a Save that would 400.
   */
  const deadlineOnly = locked && existing?.deadlineEditable === true;
  /** The stored close as a datetime-local value, to tell "actually moved" from "re-sent". */
  const storedEndAt = existing?.endsAt ? toLocalInput(existing.endsAt) : '';
  const deadlineMoved = deadlineOnly && !!endAt && endAt !== storedEndAt;

  const tally = useMemo(() => tallySelection(sections), [sections]);
  const problems = useMemo(() => selectionProblems(sections), [sections]);
  const existingTally = existing
    ? { total: existing.mcqCount + existing.codingCount, mcq: existing.mcqCount, coding: existing.codingCount, marks: existing.totalMarks }
    : null;
  // The WHOLE paper: what is being added plus, in edit mode, what the assessment already
  // holds (its items carry their own marks). Drives the review step's marks split and the
  // "unpassable by construction" warning.
  const paper = useMemo(() => {
    const already = (existing?.items ?? []).reduce(
      (acc, it) =>
        it.type === 'CODING'
          ? { ...acc, codingMarks: acc.codingMarks + it.marks }
          : { ...acc, mcqMarks: acc.mcqMarks + it.marks },
      { mcqMarks: 0, codingMarks: 0 },
    );
    return paperMarks([tally, already], passingScore);
  }, [existing, tally, passingScore]);

  const windowInvalid = !!startAt && !!endAt && new Date(endAt) <= new Date(startAt);
  const detailsValid =
    title.trim().length >= 2 &&
    !!companyId &&
    !!startAt &&
    !!endAt &&
    !windowInvalid &&
    durationMinutes >= 5 &&
    durationMinutes <= 600;

  const audienceLabel = (() => {
    const base = companyId === PLATFORM ? 'Platform-wide' : companies.find((c) => c.id === companyId)?.name ?? '—';
    const cohort = cohortOptions.find((c) => c.id === cohortId)?.name ?? individualCohorts.find((c) => c.id === cohortId)?.name;
    const college = isTpo ? 'Your college' : colleges.find((c) => c.id === collegeId)?.name;
    return [base, college, cohort].filter(Boolean).join(' · ');
  })();

  /** Replace the whole selection, computed from the latest state (removals, new sections). */
  const mutateSections = useCallback((fn: (prev: WizardSection[]) => WizardSection[]) => {
    const next = fn(latestSections.current);
    if (next === latestSections.current) return;
    latestSections.current = next;
    setSections(next);
  }, []);

  /** The ONE way items join a section: the edit runs against the latest selection and
   *  anything already in the assessment is left out and reported as skipped. */
  const updateSection = useCallback(
    (key: string): SectionUpdater =>
      (edit: SectionEdit) => {
        const { sections: next, result } = applySectionEdit(latestSections.current, latestExisting.current, key, edit);
        if (next !== latestSections.current) {
          latestSections.current = next;
          setSections(next);
        }
        return result;
      },
    [],
  );

  /** Ids already selected, read at call time from the latest selection. */
  const takenIds = useCallback(
    (type: AssessmentItemType) => collectTakenIds(latestSections.current, latestExisting.current, type),
    [],
  );

  /** Run a draw / AI request while holding Review and Publish. */
  const trackWork = useCallback(async (work: () => Promise<void>) => {
    setInFlight((n) => n + 1);
    try {
      await work();
    } finally {
      setInFlight((n) => n - 1);
    }
  }, []);

  const addSection = () => {
    const s = newSection(latestSections.current.length + 1);
    mutateSections((prev) => [...prev, s]);
    setOpenPanel(s.key);
  };

  // ── Review: pull full previews (answers / statements) for ids not fetched yet ──
  useEffect(() => {
    if (step !== 2 || !canPreview) return;
    const mcqIds: string[] = [];
    const codingIds: string[] = [];
    for (const s of sections)
      for (const it of s.items) {
        if (requestedPreview.current.has(it.id)) continue;
        requestedPreview.current.add(it.id);
        (it.type === 'MCQ' ? mcqIds : codingIds).push(it.id);
      }
    if (mcqIds.length + codingIds.length === 0) return;
    setPreviewError(null);
    setPreviewPending((n) => n + 1);
    const markMissing = (ids: string[]) => {
      if (ids.length) setMissingIds((m) => new Set([...m, ...ids]));
    };
    const jobs = [
      ...chunk(mcqIds, 500).map((ids) =>
        previewQuestions(ids).then((qs) => {
          const got = new Set(qs.map((q) => normId(q.id)));
          setMcqPreview((p) => ({ ...p, ...Object.fromEntries(qs.map((q) => [normId(q.id), q])) }));
          markMissing(ids.filter((id) => !got.has(id)));
        }),
      ),
      ...chunk(codingIds, 200).map((ids) =>
        previewAdminCodingProblems(ids).then((r) => {
          setCodingPreview((p) => ({ ...p, ...Object.fromEntries(r.items.map((it) => [normId(it.id), it])) }));
          markMissing(r.missingIds.map(normId));
        }),
      ),
    ];
    void Promise.allSettled(jobs).then((results) => {
      const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (failed) {
        // Let "Retry" (or the next visit to Review) fetch these ids again.
        for (const id of [...mcqIds, ...codingIds]) requestedPreview.current.delete(id);
        setPreviewError(describeApiError(failed.reason, 'Some question previews could not be loaded.'));
      }
      setPreviewPending((n) => n - 1);
    });
  }, [step, canPreview, sections, previewAttempt]);

  // Server-refused ids still in the selection (the banner clears as they're removed).
  const activeSelErr = useMemo<SelectionError | null>(() => {
    if (!selErr || selErr.groups.length === 0) return null;
    const counts = new Map<string, number>();
    for (const s of sections) for (const it of s.items) counts.set(it.id, (counts.get(it.id) ?? 0) + 1);
    const groups = selErr.groups
      .map((g) => {
        const repeat = /more than once/i.test(g.reason);
        return { ...g, ids: g.ids.map(normId).filter((id) => (counts.get(id) ?? 0) > (repeat ? 1 : 0)) };
      })
      .filter((g) => g.ids.length > 0);
    return groups.length ? { ...selErr, groups } : null;
  }, [selErr, sections]);

  const flagged = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of activeSelErr?.groups ?? []) for (const id of g.ids) m.set(id, g.reason);
    return m;
  }, [activeSelErr]);

  const labelFor = (id: string) => {
    for (const s of sections) {
      const it = s.items.find((x) => x.id === normId(id));
      if (it) return `${it.label.slice(0, 120)} (${s.name})`;
    }
    return null;
  };

  const requestClose = () => {
    if (creating) return;
    // After a publish / save, every way out (Done, X, Esc, backdrop) refreshes the caller's list.
    if (created || saved) {
      onCreated();
      onClose();
      return;
    }
    if (tally.total > 0 && !window.confirm('Discard this assessment? Your selected questions will be lost.')) return;
    onClose();
  };

  const publish = async () => {
    setCreating(true);
    setSelErr(null);
    const payloadSections = toPayloadSections(sections);
    const isPlatform = companyId === PLATFORM;
    const companyArg = isPlatform || !companyId ? undefined : companyId;
    try {
      if (editId && deadlineOnly) {
        // ONLY the closing date. Everything else is frozen and re-sending it unchanged
        // would still be compared field by field server-side — send nothing to compare.
        setSaved(await updateAssessment(editId, { endsAt: new Date(endAt).toISOString() }));
      } else if (editId) {
        const e = await updateAssessment(editId, {
          title: title.trim(),
          companyId: companyArg,
          platform: isPlatform,
          scheduledAt: new Date(startAt).toISOString(),
          endsAt: new Date(endAt).toISOString(),
          durationMinutes,
          proctored,
          proctorAutoSubmit: proctored && proctorAutoSubmit,
          proctorMaxWarnings,
          subscriptionLockEnabled: subscriptionLock,
          profileLockEnabled: profileLock,
          passingScore,
          addSections: payloadSections.length ? payloadSections : undefined,
          // The UI never builds a duplicate; if one slips through, refuse loudly instead of
          // silently dropping part of what the admin reviewed.
          strictDuplicates: true,
        });
        setSaved(e);
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
          proctorAutoSubmit: proctored && proctorAutoSubmit,
          proctorMaxWarnings,
          subscriptionLockEnabled: subscriptionLock,
          profileLockEnabled: profileLock,
          passingScore,
          sections: payloadSections,
          strictDuplicates: true,
        });
        setCreated(result);
      }
      setConfirmOpen(false);
    } catch (e) {
      const parsed = parseSelectionError(e, editId ? 'Could not save the assessment.' : 'Could not publish the assessment.');
      setSelErr(parsed);
      setConfirmOpen(false);
      setStep(2);
      // The drive got its first attempt meanwhile: refresh so the lock shows everywhere.
      if (parsed.kind === 'LOCKED' && editId) getEditableAssessment(editId).then(setExisting).catch(() => {});
    } finally {
      setCreating(false);
    }
  };

  const working = inFlight > 0;
  const canReview = (editId ? true : tally.total > 0) && problems.length === 0 && !working;
  const canPublish = deadlineOnly
    ? deadlineMoved && !windowInvalid
    : canReview && !locked && !activeSelErr;
  const publishLabel = deadlineOnly
    ? 'Save closing date'
    : editId
      ? tally.total
        ? `Save & add ${plural(tally.total, 'question', 'questions')}`
        : 'Save changes'
      : `Create & publish ${plural(tally.total, 'question', 'questions')}`;

  return (
    <DialogShell open onClose={requestClose} labelledBy={titleId} dismissible={!creating} maxWidth="max-w-6xl">
      {/* header */}
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
        <div className="min-w-0">
          <p className={eyebrowCls}>{isTpo ? 'Assessment center' : 'Scheduled assessments'}</p>
          <h2 id={titleId} className="mt-1 text-lg font-bold text-navy">
            {editId ? 'Edit assessment' : 'Create assessment'}
          </h2>
          <p className="text-sm text-slate-500">
            {deadlineOnly
              ? `${plural(existing?.attempts ?? 0, 'student has', 'students have')} attempted this — only the closing date can be changed.`
              : editId
                ? 'Edit details and add questions (only before anyone has attempted it).'
                : 'Draw questions at random from the bank or pick them by hand, review them, then publish.'}
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={requestClose} aria-label="Close" disabled={creating}>
          <X />
        </Button>
      </div>

      {/* steps */}
      {!created && !saved ? (
        <ol className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-6 py-3" aria-label="Steps">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-2" aria-current={i === step ? 'step' : undefined}>
              <span
                className={cn(
                  'grid size-6 place-items-center rounded-full text-[11px] font-bold',
                  i < step
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                    : i === step
                      ? 'bg-navy text-white'
                      : 'bg-slate-100 text-slate-500',
                )}
              >
                {i < step ? <Check className="size-3.5" aria-hidden /> : i + 1}
              </span>
              <span className={cn('text-sm', i === step ? 'font-semibold text-navy' : 'text-slate-500')}>
                {s}
                {i < step ? <span className="sr-only"> (done)</span> : null}
              </span>
              {i < STEPS.length - 1 ? <span className="mx-1 h-px w-6 bg-slate-200" aria-hidden /> : null}
            </li>
          ))}
        </ol>
      ) : null}

      {/* compact always-visible totals on small screens (the full card sits in the side column on large ones) */}
      {step > 0 && !created && !saved ? (
        <p className="border-b border-slate-200 px-6 py-2 text-sm text-slate-600 lg:hidden" aria-live="polite">
          <span className="font-semibold text-navy">{tally.total} selected</span> · {tally.mcq} MCQ · {tally.coding} coding ·{' '}
          {tally.marks} marks
        </p>
      ) : null}

      {/* body */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-white px-6 py-5">
        {created ? (
          <PublishedResult created={created} onDone={requestClose} />
        ) : saved ? (
          <SavedResult saved={saved} deadlineOnly={deadlineOnly} onDone={requestClose} />
        ) : step === 0 ? (
          <div className="mx-auto max-w-3xl space-y-4">
            {loadErr ? <ErrorAlert>{loadErr}</ErrorAlert> : null}
            {deadlineOnly ? <DeadlineOnlyNotice attempts={existing?.attempts ?? 0} /> : null}
            <div>
              <label htmlFor={`${titleId}-title`} className={fieldLabelCls}>
                Title
              </label>
              <input
                id={`${titleId}-title`}
                data-autofocus={!deadlineOnly || undefined}
                value={title}
                maxLength={200}
                disabled={deadlineOnly}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="TCS NQT - Round 1"
                className={`mt-1 ${inputCls}`}
              />
            </div>
            <div>
              <label htmlFor={`${titleId}-audience`} className={fieldLabelCls}>
                Audience
              </label>
              <select
                id={`${titleId}-audience`}
                value={companyId}
                disabled={deadlineOnly}
                onChange={(e) => setCompanyId(e.target.value)}
                className={`mt-1 ${inputCls}`}
              >
                <option value="">Select audience</option>
                {!isTpo && <option value={PLATFORM}>Platform-wide (all students)</option>}
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} assessment
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">A company drive pre-selects that company when you draw or browse questions.</p>
            </div>

            {isTpo ? (
              <div>
                <label htmlFor={`${titleId}-cohort`} className={fieldLabelCls}>
                  Cohort / batch (optional)
                </label>
                <select
                  id={`${titleId}-cohort`}
                  value={cohortId}
                  disabled={deadlineOnly}
                  onChange={(e) => setCohortId(e.target.value)}
                  className={`mt-1 ${inputCls}`}
                >
                  <option value="">All cohorts in your college</option>
                  {cohortOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">This assessment is limited to your college&apos;s students.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`${titleId}-college`} className={fieldLabelCls}>
                      College (optional)
                    </label>
                    <select
                      id={`${titleId}-college`}
                      value={collegeId}
                      disabled={deadlineOnly}
                      onChange={(e) => {
                        setCollegeId(e.target.value);
                        if (!individualCohorts.some((c) => c.id === cohortId)) setCohortId('');
                      }}
                      className={`mt-1 ${inputCls}`}
                    >
                      <option value="">All colleges</option>
                      {colleges.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`${titleId}-cohort`} className={fieldLabelCls}>
                      Cohort / batch (optional)
                    </label>
                    <select
                      id={`${titleId}-cohort`}
                      value={cohortId}
                      disabled={deadlineOnly}
                      onChange={(e) => {
                        const v = e.target.value;
                        setCohortId(v);
                        // An individual cohort has no college - clear the college so the
                        // drive is scoped to just that cohort (server derives NULL college).
                        if (v && individualCohorts.some((c) => c.id === v)) setCollegeId('');
                      }}
                      className={`mt-1 ${inputCls}`}
                    >
                      <option value="">All (no specific cohort)</option>
                      {collegeId && cohortOptions.length > 0 ? (
                        <optgroup label="This college’s cohorts">
                          {cohortOptions.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                      {individualCohorts.length > 0 ? (
                        <optgroup label="Individual cohorts (no college)">
                          {individualCohorts.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.studentCount})
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  College batches: Admin → Colleges → a college → Cohorts. Groups of non-college users:{' '}
                  <a
                    href="/admin/individual-cohorts"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-navy underline decoration-orange decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40"
                  >
                    Admin → Individual Cohorts
                  </a>
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor={`${titleId}-start`} className={fieldLabelCls}>
                  Opens *
                </label>
                <input
                  id={`${titleId}-start`}
                  type="datetime-local"
                  value={startAt}
                  disabled={deadlineOnly}
                  onChange={(e) => setStartAt(e.target.value)}
                  className={`mt-1 ${inputCls}`}
                />
              </div>
              <div>
                <label htmlFor={`${titleId}-end`} className={fieldLabelCls}>
                  Closes *
                </label>
                <input
                  id={`${titleId}-end`}
                  type="datetime-local"
                  value={endAt}
                  data-autofocus={deadlineOnly || undefined}
                  onChange={(e) => setEndAt(e.target.value)}
                  aria-invalid={windowInvalid || undefined}
                  aria-describedby={
                    windowInvalid ? `${titleId}-end-err` : deadlineOnly ? `${titleId}-end-open` : undefined
                  }
                  className={`mt-1 ${inputCls}`}
                />
                {deadlineOnly ? (
                  <p id={`${titleId}-end-open`} className="mt-1 text-xs font-semibold text-emerald-700">
                    Editable — students who have not attempted yet can start until this time.
                  </p>
                ) : null}
              </div>
              <div>
                <label htmlFor={`${titleId}-duration`} className={fieldLabelCls}>
                  Time per attempt (min) *
                </label>
                <input
                  id={`${titleId}-duration`}
                  type="number"
                  min={5}
                  max={600}
                  value={durationMinutes}
                  disabled={deadlineOnly}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className={`mt-1 ${inputCls}`}
                />
              </div>
            </div>
            {windowInvalid ? (
              <p id={`${titleId}-end-err`} role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
                The closing time must be after the opening time.
              </p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={`${titleId}-pass`} className={fieldLabelCls}>
                  Passing score (%)
                </label>
                <input
                  id={`${titleId}-pass`}
                  type="number"
                  min={0}
                  max={100}
                  value={passingScore}
                  disabled={deadlineOnly}
                  onChange={(e) => setPassingScore(Number(e.target.value))}
                  className={`mt-1 ${inputCls}`}
                />
              </div>
              <div className="space-y-2.5 sm:pt-6">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={proctored}
                    disabled={deadlineOnly}
                    onChange={(e) => setProctored(e.target.checked)}
                    className={checkboxCls}
                  />
                  Proctored (camera + mic)
                </label>
                {proctored ? (
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={proctorAutoSubmit}
                        disabled={deadlineOnly}
                        onChange={(e) => setProctorAutoSubmit(e.target.checked)}
                        className={checkboxCls}
                      />
                      Auto-submit after
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={proctorMaxWarnings}
                      disabled={!proctorAutoSubmit || deadlineOnly}
                      aria-label="Warnings before auto-submit"
                      onChange={(e) => setProctorMaxWarnings(Number(e.target.value) || 3)}
                      className="h-10 w-16 rounded-lg border border-slate-200 bg-white px-2 text-sm text-navy focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30 disabled:opacity-50"
                    />
                    warnings
                  </div>
                ) : null}
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={subscriptionLock}
                    disabled={deadlineOnly}
                    onChange={(e) => setSubscriptionLock(e.target.checked)}
                    className={checkboxCls}
                  />
                  Require subscription / upgrade (paywall)
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={profileLock}
                    disabled={deadlineOnly}
                    onChange={(e) => setProfileLock(e.target.checked)}
                    className={checkboxCls}
                  />
                  Require profile completion (Placement Readiness Test)
                </label>
              </div>
            </div>
          </div>
        ) : step === 1 ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="min-w-0 space-y-5">
              {existing ? <ExistingQuestions existing={existing} /> : null}
              {!locked ? (
                <>
                  {sections.map((sec, i) => {
                    const panelOpen = openPanel === undefined ? i === 0 : openPanel === sec.key;
                    return (
                      <SectionEditor
                        key={sec.key}
                        section={sec}
                        sections={sections}
                        manualAllowed={!isTpo}
                        panelOpen={panelOpen}
                        onTogglePanel={() => setOpenPanel(panelOpen ? null : sec.key)}
                        mode={modes[sec.key] ?? 'RANDOM'}
                        onMode={(m) => setModes((p) => ({ ...p, [sec.key]: m }))}
                        itemType={itemTypes[sec.key] ?? 'MCQ'}
                        onItemType={(t) => setItemTypes((p) => ({ ...p, [sec.key]: t }))}
                        topicOptions={topicOptions}
                        codingTopics={codingTopics}
                        companies={companies}
                        driveCompanySlug={driveCompanySlug}
                        existingItems={existingItems}
                        takenIds={takenIds}
                        update={updateSection(sec.key)}
                        trackWork={trackWork}
                        onRemoveSection={
                          sections.length > 1
                            ? () => {
                                if (sec.items.length && !window.confirm(`Remove ${sec.name} and its ${plural(sec.items.length, 'question', 'questions')}?`))
                                  return;
                                mutateSections((p) => p.filter((s) => s.key !== sec.key));
                              }
                            : undefined
                        }
                      />
                    );
                  })}
                  <Button type="button" variant="outline" onClick={addSection} disabled={sections.length >= LIMITS.wizardSections}>
                    <Plus aria-hidden /> Add section
                  </Button>
                  {problems.length ? (
                    <ErrorAlert>
                      <ul className="list-disc space-y-0.5 pl-5">
                        {problems.map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                    </ErrorAlert>
                  ) : null}
                </>
              ) : null}
            </div>
            <aside className="lg:sticky lg:top-0 lg:self-start">
              <SelectionSummary tally={tally} existing={existingTally} />
            </aside>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="min-w-0 space-y-5">
              <DetailsRecap
                title={title}
                audience={audienceLabel}
                startAt={startAt}
                endAt={endAt}
                durationMinutes={durationMinutes}
                passingScore={passingScore}
                proctored={proctored}
                autoSubmit={proctored && proctorAutoSubmit ? proctorMaxWarnings : null}
              />
              {deadlineOnly ? (
                <DeadlineOnlyNotice attempts={existing?.attempts ?? 0} newCloseAt={deadlineMoved ? endAt : null} />
              ) : locked ? (
                <ErrorAlert>
                  <span className="inline-flex items-center gap-1.5">
                    <Lock className="size-4" aria-hidden /> This assessment already has {existing?.attempts} attempt(s), so it can no
                    longer be changed.
                  </span>
                </ErrorAlert>
              ) : null}
              {selErr && selErr.groups.length === 0 ? <ErrorAlert>{selErr.message}</ErrorAlert> : null}
              {activeSelErr ? (
                <SelectionErrorPanel
                  error={activeSelErr}
                  labelFor={labelFor}
                  onRemoveGroup={(g, keepFirst) => mutateSections((prev) => removeIds(prev, g.ids, keepFirst))}
                />
              ) : null}
              {selErr && selErr.groups.length > 0 && !activeSelErr ? (
                <NoticeBox>All the flagged questions are removed — you can publish again.</NoticeBox>
              ) : null}
              {tally.total === 0 && editId ? (
                <p className="text-sm text-slate-500">No new questions — saving updates the details only.</p>
              ) : null}
              <ReviewStep
                sections={sections}
                paper={paper}
                passingScore={passingScore}
                canPreview={canPreview}
                companyName={companyName}
                mcqPreview={mcqPreview}
                codingPreview={codingPreview}
                missingIds={missingIds}
                previewLoading={previewPending > 0}
                previewError={previewError}
                onRetryPreview={() => {
                  setPreviewError(null);
                  setPreviewAttempt((n) => n + 1);
                }}
                flagged={flagged}
                onRemove={(key, id) => updateSection(key)((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) }))}
              />
            </div>
            <aside className="lg:sticky lg:top-0 lg:self-start">
              <SelectionSummary tally={tally} existing={existingTally} />
            </aside>
          </div>
        )}
      </div>

      {/* footer */}
      {!created && !saved ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
          <Button type="button" variant="outline" onClick={() => (step === 0 ? requestClose() : setStep(step - 1))} disabled={creating}>
            <ArrowLeft aria-hidden /> {step === 0 ? 'Cancel' : 'Back'}
          </Button>
          {step === 0 && deadlineOnly ? (
            // Nothing to review but the date the admin just typed — one click saves it.
            <Button type="button" disabled={!canPublish || creating} onClick={() => setConfirmOpen(true)}>
              {publishLabel}
            </Button>
          ) : step === 0 ? (
            <Button type="button" disabled={!detailsValid || (!!editId && !existing)} onClick={() => setStep(1)}>
              Next: questions <ArrowRight aria-hidden />
            </Button>
          ) : (
            <div className="flex flex-wrap items-center justify-end gap-3">
              {working ? (
                <span className="text-xs text-slate-500" aria-live="polite">
                  Waiting for questions still being drawn…
                </span>
              ) : null}
              {step === 1 ? (
                <Button type="button" disabled={!canReview} onClick={() => setStep(2)}>
                  {editId ? 'Review changes' : `Review ${plural(tally.total, 'question', 'questions')}`} <ArrowRight aria-hidden />
                </Button>
              ) : (
                <Button type="button" disabled={!canPublish || creating} onClick={() => setConfirmOpen(true)}>
                  {publishLabel}
                </Button>
              )}
            </div>
          )}
        </div>
      ) : null}

      <ConfirmPublishDialog
        open={confirmOpen}
        mode={editId ? 'edit' : 'create'}
        deadlineOnly={deadlineOnly}
        tally={tally}
        title={title}
        audience={audienceLabel}
        startAt={startAt}
        endAt={endAt}
        durationMinutes={durationMinutes}
        busy={creating}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={publish}
      />
    </DialogShell>
  );
}

/**
 * The state of an attempted drive, said plainly: what is frozen, what is not, and what
 * the pending change actually does. Amber (a constraint to work within), not red (an
 * error) — there IS a change the admin can make from here.
 */
function DeadlineOnlyNotice({ attempts, newCloseAt }: { attempts: number; newCloseAt?: string | null }) {
  return (
    <NoticeBox>
      <span className="inline-flex items-start gap-1.5">
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          This assessment has {plural(attempts, 'attempt', 'attempts')} — only the closing date can be changed. The
          questions, marks, start time, duration, audience and proctoring stay exactly as they are, and every recorded
          attempt keeps its answers and score.
          {newCloseAt ? (
            <span className="mt-1 block font-semibold">
              New closing time: {new Date(newCloseAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} —
              students who have not attempted it yet can start until then.
            </span>
          ) : null}
        </span>
      </span>
    </NoticeBox>
  );
}

function ExistingQuestions({ existing }: { existing: EditableAssessment }) {
  return (
    <section aria-label="Questions already in this assessment" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className={eyebrowCls}>Already in this assessment</p>
      <p className="mt-1 text-sm text-slate-600">
        {plural(existing.mcqCount + existing.codingCount, 'question', 'questions')} ({existing.mcqCount} MCQ · {existing.codingCount}{' '}
        coding) · {existing.totalMarks} marks.{existing.editable ? ' New sections below are added after these.' : ''}
      </p>
      {!existing.editable ? (
        <ErrorAlert className="mt-3">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="size-4" aria-hidden /> {plural(existing.attempts, 'student attempt', 'student attempts')} already — the
            questions are locked{existing.deadlineEditable ? '. Only the closing date can still be changed.' : ' and this assessment can no longer be edited.'}
          </span>
        </ErrorAlert>
      ) : null}
      {existing.items.length ? (
        <ul className="mt-3 max-h-44 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
          {existing.items.map((it) => (
            <li key={it.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
              <span className="w-12 shrink-0 text-xs font-semibold text-slate-400">{it.type === 'MCQ' ? 'MCQ' : 'Coding'}</span>
              <span className="min-w-0 flex-1 truncate text-slate-600">{it.label}</span>
              <span className="shrink-0 text-xs text-slate-500">{it.marks} marks</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function DetailsRecap({
  title,
  audience,
  startAt,
  endAt,
  durationMinutes,
  passingScore,
  proctored,
  autoSubmit,
}: {
  title: string;
  audience: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  passingScore: number;
  proctored: boolean;
  autoSubmit: number | null;
}) {
  const when = (v: string) => (v ? new Date(v).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—');
  return (
    <section aria-label="Assessment details" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className={eyebrowCls}>Details</p>
      <h3 className="mt-1 text-base font-bold text-navy">{title || 'Untitled assessment'}</h3>
      <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        <Recap label="Audience" value={audience} />
        <Recap label="Time per attempt" value={`${durationMinutes} min`} />
        <Recap label="Opens" value={when(startAt)} />
        <Recap label="Closes" value={when(endAt)} />
        <Recap label="Pass mark" value={`${passingScore}%`} />
        <Recap label="Proctoring" value={proctored ? (autoSubmit ? `On · auto-submit after ${autoSubmit} warnings` : 'On') : 'Off'} />
      </dl>
    </section>
  );
}

function Recap({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-slate-500">{label}:</dt>
      <dd className="font-semibold text-navy">{value}</dd>
    </div>
  );
}

function PublishedResult({ created, onDone }: { created: CreatedAssessment; onDone: () => void }) {
  return (
    <div className="mx-auto max-w-lg py-6 text-center">
      <span className="mx-auto grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
        <CheckCircle2 className="size-5" aria-hidden />
      </span>
      <h3 className="mt-4 text-lg font-bold text-navy" role="status">
        Assessment published
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        {plural(created.totalQuestions, 'question', 'questions')} ({created.mcqCount} MCQ · {created.codingCount} coding) ·{' '}
        {created.totalMarks} marks for {created.companyName}.
      </p>
      {leftOut(created.droppedDuplicates) ? (
        <NoticeBox className="mt-4 text-left">
          {plural(leftOut(created.droppedDuplicates), 'repeated question was', 'repeated questions were')} added only once.
        </NoticeBox>
      ) : null}
      {created.sections?.length ? (
        <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white text-left shadow-sm">
          {created.sections.map((s, i) => (
            <li key={`${s.name}-${i}`} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-4 py-2.5 text-sm">
              <span className="min-w-0 truncate font-semibold text-navy">{s.name}</span>
              <span className="shrink-0 text-xs text-slate-500">
                {s.mcqCount} MCQ · {s.codingCount} coding · {s.marksPerQuestion} each · {s.totalMarks} marks
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <Button type="button" className="mt-6" onClick={onDone}>
        Done
      </Button>
    </div>
  );
}

function SavedResult({
  saved,
  deadlineOnly,
  onDone,
}: {
  saved: EditedAssessment;
  deadlineOnly: boolean;
  onDone: () => void;
}) {
  const skipped = leftOut(saved.skippedAlreadyPresent, saved.droppedDuplicates);
  const closesAt = saved.endsAt ? new Date(saved.endsAt) : null;
  return (
    <div className="mx-auto max-w-lg py-6 text-center">
      <span className="mx-auto grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
        <CheckCircle2 className="size-5" aria-hidden />
      </span>
      <h3 className="mt-4 text-lg font-bold text-navy" role="status">
        {deadlineOnly ? 'Closing date updated' : 'Changes saved'}
      </h3>
      {deadlineOnly ? (
        <p className="mt-1 text-sm text-slate-600">
          {closesAt ? (
            <>
              This assessment now closes{' '}
              <span className="font-semibold text-navy">
                {closesAt.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
              . Students who have not attempted it yet can start until then; nothing else changed.
            </>
          ) : (
            'The closing time was updated. Nothing else about the assessment changed.'
          )}
        </p>
      ) : (
        <p className="mt-1 text-sm text-slate-600">
          The assessment now has {plural(saved.mcqCount + saved.codingCount, 'question', 'questions')} ({saved.mcqCount} MCQ ·{' '}
          {saved.codingCount} coding) · {saved.totalMarks} marks.
        </p>
      )}
      {skipped ? (
        <NoticeBox className="mt-4 text-left">
          {plural(skipped, 'question was', 'questions were')} not added again because the assessment already had them.
        </NoticeBox>
      ) : null}
      <Button type="button" className="mt-6" onClick={onDone}>
        Done
      </Button>
    </div>
  );
}
