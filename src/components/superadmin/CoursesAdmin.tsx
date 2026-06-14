'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  ChevronRight,
  GripVertical,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import { CourseCategory, CourseDifficulty, LessonKind } from '@/shared/enums';
import { CATEGORY_LABEL, DIFFICULTY_TONE } from '@/lib/ui-maps';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { StatusPill } from '@/components/student/StatusPill';
import { ApiRequestError } from '@/lib/api/types';
import {
  createAdminCourse,
  createAdminLesson,
  createAdminModule,
  deleteAdminCourse,
  deleteAdminLesson,
  deleteAdminModule,
  getAdminCourse,
  listAdminCourses,
  updateAdminCourse,
  updateAdminLesson,
  updateAdminModule,
  type AdminCourseDetail,
  type AdminCourseModule,
  type AdminCourseRow,
} from '@/lib/api/admin';

/**
 * Superadmin course-authoring console (Sprint 2 — Courses / Modules / Lessons).
 * Drives `/api/v1/admin/courses`, `/admin/modules`, `/admin/lessons`. A course
 * is authored as a DRAFT, given a curriculum of ordered modules and lessons,
 * then published — at which point it surfaces in the public catalog and the
 * student dashboard KPI row. Mirrors the question-bank / mock-test consoles.
 *
 * Three views, one component (the established console shape):
 *   list   — every course (drafts included) with content depth + publish state
 *   form   — course metadata (create / edit)
 *   manage — the curriculum: inline module + lesson editors
 */

const CATEGORY_OPTIONS: CourseCategory[] = [
  CourseCategory.APTITUDE,
  CourseCategory.PROGRAMMING_DSA,
  CourseCategory.COMMUNICATION_HR,
  CourseCategory.MOCK_DRIVE,
];
const DIFFICULTY_OPTIONS: CourseDifficulty[] = [
  CourseDifficulty.BEGINNER,
  CourseDifficulty.INTERMEDIATE,
  CourseDifficulty.ADVANCED,
];
const KIND_OPTIONS: LessonKind[] = [LessonKind.VIDEO, LessonKind.TEXT, LessonKind.CONCEPT_REEL];

const KIND_LABEL: Record<LessonKind, string> = {
  VIDEO: 'Video',
  TEXT: 'Reading',
  CONCEPT_REEL: 'Concept reel',
};

const SELECT_CLASS =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function describeError(err: unknown, fallback: string): string {
  return err instanceof ApiRequestError ? err.message : fallback;
}

// ── Course metadata form state ──────────────────────────────────────────────
interface CourseForm {
  slug: string;
  title: string;
  summary: string;
  coverUrl: string;
  category: CourseCategory;
  difficulty: CourseDifficulty;
  estimatedHours: number;
  isPublished: boolean;
}

const EMPTY_COURSE: CourseForm = {
  slug: '',
  title: '',
  summary: '',
  coverUrl: '',
  category: CourseCategory.APTITUDE,
  difficulty: CourseDifficulty.INTERMEDIATE,
  estimatedHours: 0,
  isPublished: false,
};

// ── Inline module / lesson draft state ──────────────────────────────────────
interface ModuleDraft {
  id: string | null;
  title: string;
  summary: string;
  orderIndex: number;
}

interface LessonDraft {
  id: string | null;
  moduleId: string;
  title: string;
  kind: LessonKind;
  durationMinutes: number;
  videoProviderId: string;
  body: string;
  orderIndex: number;
  isFree: boolean;
}

export function CoursesAdmin() {
  const [courses, setCourses] = useState<AdminCourseRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [mode, setMode] = useState<'list' | 'form' | 'manage'>('list');

  // course metadata form
  const [form, setForm] = useState<CourseForm>(EMPTY_COURSE);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // curriculum manager
  const [detail, setDetail] = useState<AdminCourseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [moduleDraft, setModuleDraft] = useState<ModuleDraft | null>(null);
  const [lessonDraft, setLessonDraft] = useState<LessonDraft | null>(null);
  const [curriculumError, setCurriculumError] = useState<string | null>(null);
  const [curriculumSaving, setCurriculumSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoadError(null);
    try {
      setCourses(await listAdminCourses());
    } catch (err) {
      setLoadError(describeError(err, 'Could not load courses.'));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // ── Course metadata: create / edit ────────────────────────────────────────
  function openCreate() {
    setForm(EMPTY_COURSE);
    setEditingId(null);
    setSlugTouched(false);
    setFormError(null);
    setMode('form');
  }

  async function openEdit(row: AdminCourseRow) {
    setBusyId(row.id);
    try {
      const c = await getAdminCourse(row.slug);
      setForm({
        slug: c.slug,
        title: c.title,
        summary: c.summary ?? '',
        coverUrl: c.coverUrl ?? '',
        category: c.category,
        difficulty: c.difficulty,
        estimatedHours: c.estimatedHours,
        isPublished: c.isPublished,
      });
      setEditingId(row.id);
      setSlugTouched(true);
      setFormError(null);
      setMode('form');
    } catch (err) {
      window.alert(describeError(err, 'Could not open the course.'));
    } finally {
      setBusyId(null);
    }
  }

  async function saveCourse() {
    setFormError(null);
    const slug = (slugTouched ? form.slug : slugify(form.title)).trim();
    if (form.title.trim().length < 2) return setFormError('Title must be at least 2 characters.');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
      return setFormError('Slug must be lowercase words separated by single hyphens.');
    if (form.estimatedHours < 0 || form.estimatedHours > 500)
      return setFormError('Estimated hours must be between 0 and 500.');

    setSaving(true);
    try {
      if (editingId) {
        await updateAdminCourse(editingId, {
          slug,
          title: form.title.trim(),
          summary: form.summary.trim() || undefined,
          coverUrl: form.coverUrl.trim() || undefined,
          category: form.category,
          difficulty: form.difficulty,
          estimatedHours: form.estimatedHours,
          isPublished: form.isPublished,
        });
      } else {
        await createAdminCourse({
          slug,
          title: form.title.trim(),
          summary: form.summary.trim() || undefined,
          coverUrl: form.coverUrl.trim() || undefined,
          category: form.category,
          difficulty: form.difficulty,
          estimatedHours: form.estimatedHours,
          isPublished: form.isPublished,
        });
      }
      await refresh();
      setMode('list');
    } catch (err) {
      setFormError(describeError(err, 'Could not save the course.'));
    } finally {
      setSaving(false);
    }
  }

  const togglePublish = useCallback(
    async (row: AdminCourseRow) => {
      setBusyId(row.id);
      try {
        await updateAdminCourse(row.id, { isPublished: !row.isPublished });
        await refresh();
      } catch (err) {
        window.alert(describeError(err, 'Could not update the course.'));
      } finally {
        setBusyId(null);
      }
    },
    [refresh],
  );

  const removeCourse = useCallback(
    async (row: AdminCourseRow) => {
      if (
        !window.confirm(
          `Delete "${row.title}"${row.moduleCount ? ` and its ${row.moduleCount} module(s) / ${row.lessonCount} lesson(s)` : ''}? This cannot be undone.`,
        )
      )
        return;
      setBusyId(row.id);
      try {
        await deleteAdminCourse(row.id);
        await refresh();
      } catch (err) {
        window.alert(describeError(err, 'Could not delete the course.'));
      } finally {
        setBusyId(null);
      }
    },
    [refresh],
  );

  // ── Curriculum manager ────────────────────────────────────────────────────
  const loadDetail = useCallback(async (slug: string) => {
    setDetailLoading(true);
    setCurriculumError(null);
    try {
      setDetail(await getAdminCourse(slug));
    } catch (err) {
      setCurriculumError(describeError(err, 'Could not load the curriculum.'));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  async function openManage(row: AdminCourseRow) {
    setBusyId(row.id);
    setModuleDraft(null);
    setLessonDraft(null);
    setDetail(null);
    setMode('manage');
    await loadDetail(row.slug);
    setBusyId(null);
  }

  function startAddModule() {
    setLessonDraft(null);
    setModuleDraft({
      id: null,
      title: '',
      summary: '',
      orderIndex: detail ? detail.modules.length : 0,
    });
    setCurriculumError(null);
  }

  function startEditModule(m: AdminCourseModule) {
    setLessonDraft(null);
    setModuleDraft({ id: m.id, title: m.title, summary: m.summary ?? '', orderIndex: m.orderIndex });
    setCurriculumError(null);
  }

  async function saveModule() {
    if (!detail || !moduleDraft) return;
    if (moduleDraft.title.trim().length < 2)
      return setCurriculumError('Module title must be at least 2 characters.');
    setCurriculumSaving(true);
    setCurriculumError(null);
    try {
      if (moduleDraft.id) {
        await updateAdminModule(moduleDraft.id, {
          title: moduleDraft.title.trim(),
          summary: moduleDraft.summary.trim() || undefined,
          orderIndex: moduleDraft.orderIndex,
        });
      } else {
        await createAdminModule({
          courseSlug: detail.slug,
          title: moduleDraft.title.trim(),
          summary: moduleDraft.summary.trim() || undefined,
          orderIndex: moduleDraft.orderIndex,
        });
      }
      setModuleDraft(null);
      await loadDetail(detail.slug);
      await refresh();
    } catch (err) {
      setCurriculumError(describeError(err, 'Could not save the module.'));
    } finally {
      setCurriculumSaving(false);
    }
  }

  async function removeModule(m: AdminCourseModule) {
    if (!detail) return;
    if (
      !window.confirm(
        `Delete module "${m.title}"${m.lessons.length ? ` and its ${m.lessons.length} lesson(s)` : ''}? This cannot be undone.`,
      )
    )
      return;
    setBusyId(m.id);
    try {
      await deleteAdminModule(m.id);
      await loadDetail(detail.slug);
      await refresh();
    } catch (err) {
      window.alert(describeError(err, 'Could not delete the module.'));
    } finally {
      setBusyId(null);
    }
  }

  function startAddLesson(m: AdminCourseModule) {
    setModuleDraft(null);
    setLessonDraft({
      id: null,
      moduleId: m.id,
      title: '',
      kind: LessonKind.VIDEO,
      durationMinutes: 0,
      videoProviderId: '',
      body: '',
      orderIndex: m.lessons.length,
      isFree: false,
    });
    setCurriculumError(null);
  }

  function startEditLesson(m: AdminCourseModule, lessonId: string) {
    const l = m.lessons.find((x) => x.id === lessonId);
    if (!l) return;
    setModuleDraft(null);
    setLessonDraft({
      id: l.id,
      moduleId: m.id,
      title: l.title,
      kind: l.kind,
      durationMinutes: l.durationMinutes,
      videoProviderId: l.videoProviderId ?? '',
      body: l.body ?? '',
      orderIndex: l.orderIndex,
      isFree: l.isFree,
    });
    setCurriculumError(null);
  }

  async function saveLesson() {
    if (!detail || !lessonDraft) return;
    if (lessonDraft.title.trim().length < 2)
      return setCurriculumError('Lesson title must be at least 2 characters.');
    if (lessonDraft.durationMinutes < 0 || lessonDraft.durationMinutes > 600)
      return setCurriculumError('Duration must be between 0 and 600 minutes.');
    setCurriculumSaving(true);
    setCurriculumError(null);
    try {
      if (lessonDraft.id) {
        await updateAdminLesson(lessonDraft.id, {
          title: lessonDraft.title.trim(),
          kind: lessonDraft.kind,
          durationMinutes: lessonDraft.durationMinutes,
          videoProviderId: lessonDraft.videoProviderId.trim() || undefined,
          body: lessonDraft.body.trim() || undefined,
          orderIndex: lessonDraft.orderIndex,
          isFree: lessonDraft.isFree,
        });
      } else {
        await createAdminLesson({
          moduleId: lessonDraft.moduleId,
          title: lessonDraft.title.trim(),
          kind: lessonDraft.kind,
          durationMinutes: lessonDraft.durationMinutes,
          videoProviderId: lessonDraft.videoProviderId.trim() || undefined,
          body: lessonDraft.body.trim() || undefined,
          orderIndex: lessonDraft.orderIndex,
          isFree: lessonDraft.isFree,
        });
      }
      setLessonDraft(null);
      await loadDetail(detail.slug);
      await refresh();
    } catch (err) {
      setCurriculumError(describeError(err, 'Could not save the lesson.'));
    } finally {
      setCurriculumSaving(false);
    }
  }

  async function removeLesson(m: AdminCourseModule, lessonId: string, lessonTitle: string) {
    if (!detail) return;
    if (!window.confirm(`Delete lesson "${lessonTitle}"? This cannot be undone.`)) return;
    setBusyId(lessonId);
    try {
      await deleteAdminLesson(lessonId);
      await loadDetail(detail.slug);
      await refresh();
    } catch (err) {
      window.alert(describeError(err, 'Could not delete the lesson.'));
    } finally {
      setBusyId(null);
    }
  }

  // ═══ Curriculum manager view ═══════════════════════════════════════════════
  if (mode === 'manage') {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setMode('list');
              setDetail(null);
            }}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-navy"
          >
            <X className="size-4" aria-hidden="true" /> Back to courses
          </button>
          {detail ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const row = courses?.find((c) => c.id === detail.id);
                if (row) void openEdit(row);
              }}
            >
              <Pencil className="size-4" aria-hidden="true" /> Edit course
            </Button>
          ) : null}
        </div>

        {detailLoading || !detail ? (
          <div className="flex justify-center rounded-xl border border-slate-200 bg-white p-12">
            <Loader2 className="size-5 animate-spin text-slate-400" aria-hidden="true" />
          </div>
        ) : (
          <>
            {/* Course header */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    {CATEGORY_LABEL[detail.category] ?? detail.category}
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-navy">{detail.title}</h2>
                  <p className="mt-0.5 text-xs text-slate-400">/{detail.slug}</p>
                </div>
                {detail.isPublished ? (
                  <StatusPill tone="positive" label="Published" />
                ) : (
                  <StatusPill tone="neutral" label="Draft" />
                )}
              </div>
              {detail.summary ? (
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{detail.summary}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusPill
                  tone={DIFFICULTY_TONE[detail.difficulty]?.tone ?? 'neutral'}
                  label={DIFFICULTY_TONE[detail.difficulty]?.label ?? detail.difficulty}
                />
                <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                  {detail.modules.length} module{detail.modules.length === 1 ? '' : 's'}
                </span>
                <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                  {detail.estimatedHours}h estimated
                </span>
              </div>
            </div>

            {/* Modules */}
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Curriculum
              </p>
              <Button size="sm" onClick={startAddModule} disabled={!!moduleDraft || !!lessonDraft}>
                <Plus className="size-4" aria-hidden="true" /> Add module
              </Button>
            </div>

            {curriculumError ? (
              <p
                role="alert"
                className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200"
              >
                {curriculumError}
              </p>
            ) : null}

            {/* New-module form (top of list) */}
            {moduleDraft && moduleDraft.id === null ? (
              <ModuleForm
                draft={moduleDraft}
                saving={curriculumSaving}
                onChange={setModuleDraft}
                onSave={saveModule}
                onCancel={() => setModuleDraft(null)}
              />
            ) : null}

            {detail.modules.length === 0 && !moduleDraft ? (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <span className="mx-auto grid size-11 place-items-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
                  <Layers className="size-5" aria-hidden="true" />
                </span>
                <p className="mt-3 text-sm font-semibold text-navy">No modules yet.</p>
                <p className="mt-1 text-xs text-slate-500">
                  Add your first module to start building the curriculum.
                </p>
              </div>
            ) : null}

            <div className="space-y-4">
              {detail.modules.map((m) => (
                <div
                  key={m.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                  {/* Module header */}
                  {moduleDraft && moduleDraft.id === m.id ? (
                    <div className="p-5">
                      <ModuleForm
                        draft={moduleDraft}
                        saving={curriculumSaving}
                        onChange={setModuleDraft}
                        onSave={saveModule}
                        onCancel={() => setModuleDraft(null)}
                      />
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3.5">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-violet-50 text-[11px] font-bold text-violet-600 ring-1 ring-violet-100">
                          {m.orderIndex + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-navy">{m.title}</p>
                          {m.summary ? (
                            <p className="mt-0.5 text-xs text-slate-500">{m.summary}</p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEditModule(m)}
                          disabled={!!moduleDraft || !!lessonDraft}
                          aria-label={`Edit module ${m.title}`}
                          className="grid size-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200 hover:text-navy disabled:opacity-40"
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeModule(m)}
                          disabled={busyId === m.id || !!moduleDraft || !!lessonDraft}
                          aria-label={`Delete module ${m.title}`}
                          className="grid size-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Lessons */}
                  <div className="divide-y divide-slate-100">
                    {m.lessons.map((l) =>
                      lessonDraft && lessonDraft.id === l.id ? (
                        <div key={l.id} className="p-5">
                          <LessonForm
                            draft={lessonDraft}
                            saving={curriculumSaving}
                            onChange={setLessonDraft}
                            onSave={saveLesson}
                            onCancel={() => setLessonDraft(null)}
                          />
                        </div>
                      ) : (
                        <div
                          key={l.id}
                          className="flex items-center justify-between gap-3 px-5 py-3"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <GripVertical
                              className="size-4 shrink-0 text-slate-300"
                              aria-hidden="true"
                            />
                            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-orange/10 text-orange ring-1 ring-orange/20">
                              <Video className="size-3.5" aria-hidden="true" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-navy">{l.title}</p>
                              <p className="text-[11px] text-slate-400">
                                {KIND_LABEL[l.kind]} · {l.durationMinutes} min
                                {l.isFree ? ' · Free preview' : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => startEditLesson(m, l.id)}
                              disabled={!!moduleDraft || !!lessonDraft}
                              aria-label={`Edit lesson ${l.title}`}
                              className="grid size-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-navy disabled:opacity-40"
                            >
                              <Pencil className="size-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeLesson(m, l.id, l.title)}
                              disabled={busyId === l.id || !!moduleDraft || !!lessonDraft}
                              aria-label={`Delete lesson ${l.title}`}
                              className="grid size-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                            >
                              <Trash2 className="size-4" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      ),
                    )}

                    {/* New-lesson form for this module */}
                    {lessonDraft && lessonDraft.id === null && lessonDraft.moduleId === m.id ? (
                      <div className="p-5">
                        <LessonForm
                          draft={lessonDraft}
                          saving={curriculumSaving}
                          onChange={setLessonDraft}
                          onSave={saveLesson}
                          onCancel={() => setLessonDraft(null)}
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startAddLesson(m)}
                        disabled={!!moduleDraft || !!lessonDraft}
                        className="flex w-full items-center gap-2 px-5 py-3 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-navy disabled:opacity-40"
                      >
                        <Plus className="size-4" aria-hidden="true" /> Add lesson
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // ═══ Course metadata form view ═════════════════════════════════════════════
  if (mode === 'form') {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy">
            {editingId ? 'Edit course' : 'New course'}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setMode('list')}>
            <X className="size-4" aria-hidden="true" /> Cancel
          </Button>
        </div>

        <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormField
              id="course-title"
              label="Title"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  title: e.target.value,
                  slug: slugTouched ? f.slug : slugify(e.target.value),
                }))
              }
              placeholder="e.g. Quantitative Aptitude — Foundations"
            />
          </div>
          <div className="sm:col-span-2">
            <FormField
              id="course-slug"
              label="Slug (URL)"
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setForm((f) => ({ ...f, slug: e.target.value }));
              }}
              placeholder="quantitative-aptitude-foundations"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="course-category"
              className="text-sm font-medium leading-none text-navy"
            >
              Category
            </label>
            <select
              id="course-category"
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value as CourseCategory }))
              }
              className={SELECT_CLASS}
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c] ?? c}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="course-difficulty"
              className="text-sm font-medium leading-none text-navy"
            >
              Difficulty
            </label>
            <select
              id="course-difficulty"
              value={form.difficulty}
              onChange={(e) =>
                setForm((f) => ({ ...f, difficulty: e.target.value as CourseDifficulty }))
              }
              className={SELECT_CLASS}
            >
              {DIFFICULTY_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {DIFFICULTY_TONE[d]?.label ?? d}
                </option>
              ))}
            </select>
          </div>

          <FormField
            id="course-hours"
            label="Estimated hours"
            type="number"
            value={String(form.estimatedHours)}
            onChange={(e) => setForm((f) => ({ ...f, estimatedHours: Number(e.target.value) }))}
          />
          <FormField
            id="course-cover"
            label="Cover image URL (optional)"
            value={form.coverUrl}
            onChange={(e) => setForm((f) => ({ ...f, coverUrl: e.target.value }))}
            placeholder="https://…"
          />

          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="course-summary" className="text-sm font-medium leading-none text-navy">
              Summary (optional)
            </label>
            <textarea
              id="course-summary"
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              rows={3}
              placeholder="What this course covers and who it's for."
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy placeholder:text-slate-400 focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
              className="rounded border-slate-300"
            />
            Published (visible in the student catalog)
          </label>
        </div>

        {formError ? (
          <p
            role="alert"
            className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200"
          >
            {formError}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={() => setMode('list')} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={saveCourse} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {editingId ? 'Save changes' : 'Create course'}
          </Button>
        </div>
      </div>
    );
  }

  // ═══ Course list view ══════════════════════════════════════════════════════
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {courses ? `${courses.length} course${courses.length === 1 ? '' : 's'}` : 'Loading…'}
        </p>
        <Button onClick={openCreate} size="sm">
          <Plus className="size-4" aria-hidden="true" /> New course
        </Button>
      </div>

      {loadError ? (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{loadError}</p>
      ) : courses === null ? (
        <div className="flex justify-center rounded-xl border border-slate-200 bg-white p-12">
          <Loader2 className="size-5 animate-spin text-slate-400" aria-hidden="true" />
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <span className="mx-auto grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
            <BookOpen className="size-5" aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm font-semibold text-navy">No courses yet.</p>
          <p className="mt-1 text-xs text-slate-500">
            Create your first course, then build out its modules and lessons.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[2.4fr_1.2fr_1fr_1fr_auto] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 md:grid">
            {['Course', 'Category', 'Content', 'Status', 'Actions'].map((h) => (
              <span
                key={h}
                className="text-[10px] font-semibold uppercase tracking-widest text-slate-400"
              >
                {h}
              </span>
            ))}
          </div>
          {courses.map((c, idx) => (
            <div
              key={c.id}
              className={`grid grid-cols-1 gap-2 px-5 py-3.5 md:grid-cols-[2.4fr_1.2fr_1fr_1fr_auto] md:items-center md:gap-4 ${idx < courses.length - 1 ? 'border-b border-slate-100' : ''}`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-navy">{c.title}</p>
                <p className="text-[11px] text-slate-400">
                  /{c.slug} · {DIFFICULTY_TONE[c.difficulty]?.label ?? c.difficulty}
                </p>
              </div>
              <p className="text-sm text-slate-600">{CATEGORY_LABEL[c.category] ?? c.category}</p>
              <p className="text-sm text-slate-600">
                {c.moduleCount} mod · {c.lessonCount} lessons
              </p>
              <div>
                {c.isPublished ? (
                  <StatusPill tone="positive" label="Published" />
                ) : (
                  <StatusPill tone="neutral" label="Draft" />
                )}
              </div>
              <div className="flex items-center gap-2 md:justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openManage(c)}
                  disabled={busyId === c.id}
                >
                  Curriculum <ChevronRight className="size-3.5" aria-hidden="true" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(c)}
                  disabled={busyId === c.id}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => togglePublish(c)}
                  disabled={busyId === c.id}
                >
                  {c.isPublished ? 'Unpublish' : 'Publish'}
                </Button>
                <button
                  type="button"
                  onClick={() => removeCourse(c)}
                  disabled={busyId === c.id}
                  aria-label={`Delete ${c.title}`}
                  className="grid size-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Inline module editor ────────────────────────────────────────────────────
function ModuleForm({
  draft,
  saving,
  onChange,
  onSave,
  onCancel,
}: {
  draft: ModuleDraft;
  saving: boolean;
  onChange: (d: ModuleDraft) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-orange/30 bg-orange/5 p-5">
      <p className="text-sm font-bold text-navy">{draft.id ? 'Edit module' : 'New module'}</p>
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <FormField
          id="module-title"
          label="Module title"
          value={draft.title}
          onChange={(e) => onChange({ ...draft, title: e.target.value })}
          placeholder="e.g. Number Systems & Divisibility"
        />
        <FormField
          id="module-order"
          label="Order"
          type="number"
          value={String(draft.orderIndex)}
          onChange={(e) => onChange({ ...draft, orderIndex: Number(e.target.value) })}
          className="w-24"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="module-summary" className="text-sm font-medium leading-none text-navy">
          Summary (optional)
        </label>
        <textarea
          id="module-summary"
          value={draft.summary}
          onChange={(e) => onChange({ ...draft, summary: e.target.value })}
          rows={2}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy placeholder:text-slate-400 focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {draft.id ? 'Save module' : 'Add module'}
        </Button>
      </div>
    </div>
  );
}

// ── Inline lesson editor ────────────────────────────────────────────────────
function LessonForm({
  draft,
  saving,
  onChange,
  onSave,
  onCancel,
}: {
  draft: LessonDraft;
  saving: boolean;
  onChange: (d: LessonDraft) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-orange/30 bg-orange/5 p-5">
      <p className="text-sm font-bold text-navy">{draft.id ? 'Edit lesson' : 'New lesson'}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormField
            id="lesson-title"
            label="Lesson title"
            value={draft.title}
            onChange={(e) => onChange({ ...draft, title: e.target.value })}
            placeholder="e.g. HCF and LCM — core techniques"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="lesson-kind" className="text-sm font-medium leading-none text-navy">
            Kind
          </label>
          <select
            id="lesson-kind"
            value={draft.kind}
            onChange={(e) => onChange({ ...draft, kind: e.target.value as LessonKind })}
            className={SELECT_CLASS}
          >
            {KIND_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </div>
        <FormField
          id="lesson-duration"
          label="Duration (minutes)"
          type="number"
          value={String(draft.durationMinutes)}
          onChange={(e) => onChange({ ...draft, durationMinutes: Number(e.target.value) })}
        />
        <FormField
          id="lesson-provider"
          label="Video provider ID (optional)"
          value={draft.videoProviderId}
          onChange={(e) => onChange({ ...draft, videoProviderId: e.target.value })}
          placeholder="e.g. youtube:dQw4w9WgXcQ"
        />
        <FormField
          id="lesson-order"
          label="Order"
          type="number"
          value={String(draft.orderIndex)}
          onChange={(e) => onChange({ ...draft, orderIndex: Number(e.target.value) })}
        />
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="lesson-body" className="text-sm font-medium leading-none text-navy">
            Body / notes (optional)
          </label>
          <textarea
            id="lesson-body"
            value={draft.body}
            onChange={(e) => onChange({ ...draft, body: e.target.value })}
            rows={3}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy placeholder:text-slate-400 focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600 sm:col-span-2">
          <input
            type="checkbox"
            checked={draft.isFree}
            onChange={(e) => onChange({ ...draft, isFree: e.target.checked })}
            className="rounded border-slate-300"
          />
          Free preview (accessible without enrolment)
        </label>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {draft.id ? 'Save lesson' : 'Add lesson'}
        </Button>
      </div>
    </div>
  );
}
