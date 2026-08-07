'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowUp, FileText, Film, Loader2, Plus, PlayCircle, ListChecks, Sparkles, Trash2, X } from 'lucide-react';
import { VimeoPicker } from '@/components/media/VimeoPicker';
import { cn } from '@/lib/utils';
import { listAdminCompanies, type AdminCompanyRow } from '@/lib/api/admin';
import { listTopicsWithCounts, type ApiTopic } from '@/lib/api/catalog';
import {
  createItem,
  createItemsBulk,
  createSection,
  createTopic,
  deleteItem,
  deleteSection,
  deleteTopic,
  generateSectionStudyMaterialQuizzes,
  generateStudyMaterialQuizzes,
  getAdminSectionStudyMaterial,
  getAdminStudyMaterial,
  normalizeTopicTitles,
  reorderStudyMaterial,
  updateItem,
  updateSection,
  updateTopic,
  type AdminStudyMaterialDto,
  type AdminStudyMaterialItemDto,
  type ItemInput,
} from '@/lib/api/study-material-admin';
import { buildSections } from '@/lib/sections/section-catalog';
import { cleanVideoTitle } from '@/lib/video-title';
import { ApiRequestError } from '@/lib/api/types';
import type { StudyMaterialItemKind } from '@/shared/dto/study-material.dto';

type Scope = 'company' | 'section';

const KIND_META: Record<StudyMaterialItemKind, { icon: typeof PlayCircle; label: string; cls: string }> = {
  VIDEO: { icon: PlayCircle, label: 'Video', cls: 'bg-[#fff5ea] text-[#f5b400]' },
  QUIZ: { icon: ListChecks, label: 'Quiz', cls: 'bg-amber-50 text-amber-600' },
  ARTICLE: { icon: FileText, label: 'Article', cls: 'bg-sky-50 text-sky-600' },
};

export function StudyMaterialAdmin() {
  const [scope, setScope] = useState<Scope>('company');
  const [companies, setCompanies] = useState<AdminCompanyRow[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [sectionSlug, setSectionSlug] = useState('');
  const [tree, setTree] = useState<AdminStudyMaterialDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState<ApiTopic[]>([]);
  const [newSection, setNewSection] = useState('');
  const [itemForm, setItemForm] = useState<{ topicId: string; item?: AdminStudyMaterialItemDto } | null>(null);
  const [bulkTopicId, setBulkTopicId] = useState<string | null>(null); // topic receiving a bulk Vimeo import
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  // Surface failures instead of swallowing them: a silently-rejected createSection/save
  // was indistinguishable from "the button does nothing" — the reported "can't create a
  // section" symptom.
  const [actionError, setActionError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    listAdminCompanies()
      .then((cs) => {
        setCompanies(cs);
        if (cs[0]) setCompanyId(cs[0].id);
      })
      .catch(() => {});
    listTopicsWithCounts()
      .then((ts) => {
        setTopics(ts);
        const roots = buildSections(ts);
        if (roots[0]) setSectionSlug((prev) => prev || roots[0].slug);
      })
      .catch(() => {});
  }, []);

  /** Sectional-Hub roots to author against (+ synthetic Coding). */
  const sectionOptions = useMemo(() => {
    const roots = buildSections(topics).map((s) => ({ slug: s.slug, name: s.name }));
    return [...roots, { slug: 'coding', name: 'Coding' }];
  }, [topics]);

  const scopeReady = scope === 'company' ? !!companyId : !!sectionSlug;

  const load = useCallback(() => {
    if (scope === 'company' ? !companyId : !sectionSlug) return;
    setLoading(true);
    setLoadError(false);
    const p =
      scope === 'company' ? getAdminStudyMaterial(companyId) : getAdminSectionStudyMaterial(sectionSlug);
    p.then(setTree)
      .catch(() => {
        setTree(null);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, [scope, companyId, sectionSlug]);
  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      load();
    } catch (e) {
      // Show WHY it failed (e.g. a 400 "section title required", a 403) instead of the
      // silent no-op that made section creation look broken.
      setActionError(e instanceof ApiRequestError ? e.message : 'That action failed — please try again.');
    } finally {
      setBusy(false);
    }
  };

  const addSection = () => {
    const title = newSection.trim();
    if (!title || !scopeReady) return;
    setNewSection('');
    void run(() =>
      createSection(scope === 'company' ? { companyId, title } : { sectionSlug, title }),
    );
  };

  // Position-based reorder: swap a section with its neighbour and persist the full order
  // (the server sets order_index = list position). Lets a new section be slotted anywhere
  // without deleting/recreating anything.
  const moveSection = (index: number, dir: -1 | 1) => {
    if (!tree) return;
    const j = index + dir;
    if (j < 0 || j >= tree.sections.length) return;
    const ids = tree.sections.map((s) => s.id);
    [ids[index], ids[j]] = [ids[j], ids[index]];
    void run(() => reorderStudyMaterial('section', ids));
  };

  // Same position-based reorder, one level down: swap a topic with its neighbour WITHIN
  // its section and persist the section's full topic order.
  const moveTopic = (topics: { id: string }[], ti: number, dir: -1 | 1) => {
    const j = ti + dir;
    if (j < 0 || j >= topics.length) return;
    const ids = topics.map((t) => t.id);
    [ids[ti], ids[j]] = [ids[j], ids[ti]];
    void run(() => reorderStudyMaterial('topic', ids));
  };

  // Reorder a VIDEO/quiz/article item within its topic — fixes a bulk import whose Vimeo
  // order didn't match the intended sequence.
  const moveItem = (items: { id: string }[], ii: number, dir: -1 | 1) => {
    const j = ii + dir;
    if (j < 0 || j >= items.length) return;
    const ids = items.map((i) => i.id);
    [ids[ii], ids[j]] = [ids[j], ids[ii]];
    void run(() => reorderStudyMaterial('item', ids));
  };

  // One click → rewrite every item title in the tree to its human form
  // ("S2_V320_network_types" → "Network Types"), for content bulk-imported before the
  // auto-clean shipped. Titles stay editable afterwards.
  const cleanAllTitles = async () => {
    if (!tree) return;
    const topicIds = tree.sections.flatMap((s) => s.topics.map((t) => t.id));
    if (topicIds.length === 0) return;
    setCleaning(true);
    setActionError(null);
    try {
      let total = 0;
      for (const id of topicIds) total += (await normalizeTopicTitles(id)).updated;
      load();
      alert(`Cleaned ${total} title${total === 1 ? '' : 's'}.`);
    } catch (e) {
      setActionError(e instanceof ApiRequestError ? e.message : 'Could not clean titles — please try again.');
    } finally {
      setCleaning(false);
    }
  };

  const runGenerate = async () => {
    if (!scopeReady) return;
    const label = scope === 'company' ? "this company's" : "this section's";
    if (
      !confirm(
        `Regenerate ${label} quiz sections from the ${scope === 'company' ? "company's" : 'platform'} question bank? Auto-generated quizzes are replaced with fresh ones (your videos and hand-added sections are kept).`,
      )
    )
      return;
    setGenerating(true);
    try {
      const r =
        scope === 'company'
          ? await generateStudyMaterialQuizzes(companyId)
          : await generateSectionStudyMaterialQuizzes(sectionSlug);
      load();
      alert(`Generated ${r.sections} sections · ${r.topics} topics · ${r.quizzes} quizzes from the question bank.`);
    } finally {
      setGenerating(false);
    }
  };

  const quizSlugs = useMemo(() => topics.filter((t) => t.parentId).map((t) => ({ slug: t.slug, name: t.name })), [topics]);

  return (
    <div className="space-y-4">
      {/* Scope + target picker */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        {/* Company vs Section scope */}
        <div className="inline-flex rounded-full bg-slate-100 p-0.5">
          {(['company', 'section'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-bold capitalize transition',
                scope === s ? 'bg-white text-navy shadow-sm' : 'text-slate-500 hover:text-navy',
              )}
            >
              {s === 'company' ? 'Company hub' : 'Sectional hub'}
            </button>
          ))}
        </div>

        {scope === 'company' ? (
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-navy"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          <select
            value={sectionSlug}
            onChange={(e) => setSectionSlug(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-navy"
          >
            {sectionOptions.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        {tree && <span className="text-xs text-slate-500">{tree.sections.length} sections · edits show instantly on the student side</span>}
        {(loading || busy) && <Loader2 className="size-4 animate-spin text-slate-400" />}
        <button
          type="button"
          onClick={() => void cleanAllTitles()}
          disabled={!tree || cleaning || busy}
          title="Rewrite every video title from its Vimeo filename (e.g. S2_V320_network_types) to a human title (Network Types). Titles stay editable."
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-navy transition hover:bg-slate-50 disabled:opacity-50"
        >
          {cleaning ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />}
          Clean up titles
        </button>
        <button
          type="button"
          onClick={runGenerate}
          disabled={!scopeReady || generating}
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-[#1f2d4d] to-[#0a0a0c] px-3.5 py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {generating ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          Auto-generate quizzes
        </button>
      </div>

      {actionError && (
        <div role="alert" className="rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {actionError}
        </div>
      )}

      {/* Sections */}
      {tree && (
        <div className="space-y-3">
          {tree.sections.map((s, si) => (
            <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                {/* Position controls — reorder a section without deleting/recreating it. */}
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => moveSection(si, -1)}
                    disabled={si === 0 || busy}
                    aria-label="Move section up"
                    className="grid size-5 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-navy disabled:opacity-30"
                  >
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSection(si, 1)}
                    disabled={si === tree.sections.length - 1 || busy}
                    aria-label="Move section down"
                    className="grid size-5 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-navy disabled:opacity-30"
                  >
                    <ArrowDown className="size-3.5" />
                  </button>
                </div>
                <InlineText
                  value={s.title}
                  onSave={(title) => run(() => updateSection(s.id, { title }))}
                  className="flex-1 text-base font-bold text-navy"
                />
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={s.isPublished}
                    onChange={(e) => run(() => updateSection(s.id, { isPublished: e.target.checked }))}
                  />
                  Published
                </label>
                {scope === 'company' && (
                  <label
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-600"
                    title="Show this section's videos on the company hub's Overview tab (unlocked, inline) and hide the section from the Study Material tab."
                  >
                    <input
                      type="checkbox"
                      checked={s.isOverview}
                      onChange={(e) => run(() => updateSection(s.id, { isOverview: e.target.checked }))}
                    />
                    Overview tab
                  </label>
                )}
                <IconBtn label="Delete section" onClick={() => confirm(`Delete section "${s.title}" and everything in it?`) && run(() => deleteSection(s.id))}>
                  <Trash2 className="size-4" />
                </IconBtn>
              </div>

              {/* Topics */}
              <div className="mt-3 space-y-2 border-l-2 border-slate-100 pl-3">
                {s.topics.map((t, ti) => (
                  <div key={t.id} className="rounded-xl bg-slate-50/60 p-3">
                    <div className="flex items-center gap-2">
                      {/* Position controls — reorder a topic within its section. */}
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => moveTopic(s.topics, ti, -1)}
                          disabled={ti === 0 || busy}
                          aria-label="Move topic up"
                          className="grid size-4 place-items-center rounded text-slate-400 hover:bg-slate-200 hover:text-navy disabled:opacity-30"
                        >
                          <ArrowUp className="size-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveTopic(s.topics, ti, 1)}
                          disabled={ti === s.topics.length - 1 || busy}
                          aria-label="Move topic down"
                          className="grid size-4 place-items-center rounded text-slate-400 hover:bg-slate-200 hover:text-navy disabled:opacity-30"
                        >
                          <ArrowDown className="size-3" />
                        </button>
                      </div>
                      <InlineText value={t.title} onSave={(title) => run(() => updateTopic(t.id, { title }))} className="flex-1 text-sm font-bold text-navy" />
                      <button
                        type="button"
                        onClick={() => setItemForm({ topicId: t.id })}
                        className="inline-flex items-center gap-1 rounded-full bg-navy px-2.5 py-1 text-[11px] font-bold text-white hover:bg-navy/90"
                      >
                        <Plus className="size-3" /> Item
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkTopicId(t.id)}
                        title="Add multiple videos from a Vimeo folder at once"
                        className="inline-flex items-center gap-1 rounded-full border border-navy/20 bg-white px-2.5 py-1 text-[11px] font-bold text-navy hover:bg-slate-50"
                      >
                        <Film className="size-3" /> Bulk add
                      </button>
                      <IconBtn label="Delete topic" onClick={() => confirm(`Delete topic "${t.title}"?`) && run(() => deleteTopic(t.id))}>
                        <Trash2 className="size-3.5" />
                      </IconBtn>
                    </div>
                    {/* Items */}
                    <ul className="mt-2 space-y-1.5">
                      {t.items.map((it, ii) => {
                        const m = KIND_META[it.kind];
                        const Icon = m.icon;
                        return (
                          <li key={it.id} className="flex items-center gap-2.5 rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100">
                            {/* Position controls — reorder a video within its topic (fixes bulk-import order). */}
                            <div className="flex flex-col">
                              <button
                                type="button"
                                onClick={() => moveItem(t.items, ii, -1)}
                                disabled={ii === 0 || busy}
                                aria-label="Move item up"
                                className="grid size-4 place-items-center rounded text-slate-300 hover:bg-slate-100 hover:text-navy disabled:opacity-25"
                              >
                                <ArrowUp className="size-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveItem(t.items, ii, 1)}
                                disabled={ii === t.items.length - 1 || busy}
                                aria-label="Move item down"
                                className="grid size-4 place-items-center rounded text-slate-300 hover:bg-slate-100 hover:text-navy disabled:opacity-25"
                              >
                                <ArrowDown className="size-3" />
                              </button>
                            </div>
                            <span className={cn('grid size-7 shrink-0 place-items-center rounded-lg', m.cls)}>
                              <Icon className="size-3.5" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-navy">{it.title}</p>
                              <p className="truncate text-[11px] text-slate-500">
                                {it.kind === 'QUIZ' ? `quiz → ${it.quizTopicSlug ?? '-'}` : it.url ?? '-'}
                              </p>
                            </div>
                            <button type="button" onClick={() => setItemForm({ topicId: t.id, item: it })} className="text-[11px] font-bold text-slate-600 hover:text-navy">
                              Edit
                            </button>
                            <IconBtn label="Delete item" onClick={() => run(() => deleteItem(it.id))}>
                              <Trash2 className="size-3.5" />
                            </IconBtn>
                          </li>
                        );
                      })}
                      {t.items.length === 0 && <li className="px-1 text-[11px] text-slate-500">No items yet.</li>}
                    </ul>
                  </div>
                ))}
                <AddInline placeholder="+ Add topic" onAdd={(title) => run(() => createTopic({ sectionId: s.id, title }))} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load error — surface it AND keep the create control usable below, so a transient
          tree fetch failure doesn't hide the whole authoring surface. */}
      {loadError && !loading && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>Couldn&apos;t load this {scope === 'company' ? "company's" : "section's"} study material.</span>
          <button
            type="button"
            onClick={load}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      {/* Add section — available whenever a target is selected, even before/without a
          loaded tree, so the FIRST section can always be created. */}
      {scopeReady && (
        <div className="flex items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white p-3">
          <input
            value={newSection}
            onChange={(e) => setNewSection(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSection()}
            placeholder="New section title (e.g. Technical)"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <button type="button" onClick={addSection} disabled={!newSection.trim()} className="inline-flex items-center gap-1.5 rounded-full bg-orange px-4 py-2 text-sm font-bold text-[#171717] disabled:opacity-50">
            <Plus className="size-4" /> Add section
          </button>
        </div>
      )}

      <AnimatePresence>
        {itemForm && (
          <ItemForm
            topicId={itemForm.topicId}
            item={itemForm.item}
            quizSlugs={quizSlugs}
            busy={busy}
            onClose={() => setItemForm(null)}
            onSave={async (input) => {
              await run(() => (itemForm.item ? updateItem(itemForm.item.id, input) : createItem({ ...input, topicId: itemForm.topicId })));
              setItemForm(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Bulk video import: pick a Vimeo folder, "Select all", "Add N to platform" →
          create one VIDEO item per selected video on this topic. */}
      {bulkTopicId && (
        <VimeoPicker
          onClose={() => setBulkTopicId(null)}
          onPickMany={(videos) => {
            const topicId = bulkTopicId;
            void run(() =>
              createItemsBulk(
                topicId,
                videos.map((v) => ({
                  // Store the human title ("Network Types"), not the raw Vimeo filename
                  // ("S2_V320_network_types"). Still editable per-item afterwards.
                  title: cleanVideoTitle(v.title),
                  url: v.link,
                  durationLabel:
                    v.durationSeconds > 0
                      ? `${Math.floor(v.durationSeconds / 60)}:${String(Math.floor(v.durationSeconds % 60)).padStart(2, '0')}`
                      : undefined,
                })),
              ),
            );
          }}
        />
      )}
    </div>
  );
}

// ── item create/edit form ───────────────────────────────────────────────────
function ItemForm({
  topicId,
  item,
  quizSlugs,
  busy,
  onSave,
  onClose,
}: {
  topicId: string;
  item?: AdminStudyMaterialItemDto;
  quizSlugs: Array<{ slug: string; name: string }>;
  busy: boolean;
  onSave: (input: ItemInput) => void;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<StudyMaterialItemKind>(item?.kind ?? 'VIDEO');
  const [title, setTitle] = useState(item?.title ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [url, setUrl] = useState(item?.url ?? '');
  const [durationLabel, setDurationLabel] = useState(item?.durationLabel ?? '');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [quizTopicSlug, setQuizTopicSlug] = useState(item?.quizTopicSlug ?? '');
  const [quizQuestionCount, setQuizQuestionCount] = useState(item?.quizQuestionCount?.toString() ?? '');
  void topicId;

  const submit = () => {
    if (!title.trim()) return;
    onSave({
      kind,
      title: title.trim(),
      description: description.trim() || null,
      url: kind === 'QUIZ' ? null : url.trim() || null,
      durationLabel: kind === 'VIDEO' ? durationLabel.trim() || null : null,
      quizTopicSlug: kind === 'QUIZ' ? quizTopicSlug.trim() || null : null,
      quizQuestionCount: kind === 'QUIZ' && quizQuestionCount ? Number(quizQuestionCount) : null,
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <motion.div className="absolute inset-0 bg-slate-900/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        className="relative w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-navy">{item ? 'Edit item' : 'Add item'}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            {(['VIDEO', 'QUIZ', 'ARTICLE'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn('flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition', kind === k ? 'border-[#ffc42d] bg-[#fff5ea] text-[#1a1a1a]' : 'border-slate-200 text-slate-600 hover:border-slate-300')}
              >
                {KIND_META[k].label}
              </button>
            ))}
          </div>

          <Field label="Title">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Concept Video" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </Field>
          <Field label="Description (optional)">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </Field>

          {kind !== 'QUIZ' ? (
            <>
              <Field label={kind === 'VIDEO' ? 'Video link (Vimeo or YouTube)' : 'Article link'}>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste the share link - provider is detected automatically" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  {kind === 'VIDEO' && (
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-[#ffc42d] hover:text-navy"
                    >
                      <Film className="size-4" /> Browse Vimeo
                    </button>
                  )}
                </div>
              </Field>
              {kind === 'VIDEO' && (
                <Field label="Duration label (optional)">
                  <input value={durationLabel} onChange={(e) => setDurationLabel(e.target.value)} placeholder="e.g. 24:15" className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </Field>
              )}
              {pickerOpen ? (
                <VimeoPicker
                  onPick={(v) => {
                    setUrl(v.link);
                    // Auto-fill a HUMAN title from the Vimeo filename when the field is
                    // empty ("S2_V320_network_types" → "Network Types"); still editable.
                    if (!title.trim()) setTitle(cleanVideoTitle(v.title));
                    if (!durationLabel && v.durationSeconds > 0) {
                      const m = Math.floor(v.durationSeconds / 60);
                      const s = Math.floor(v.durationSeconds % 60);
                      setDurationLabel(`${m}:${s.toString().padStart(2, '0')}`);
                    }
                  }}
                  onClose={() => setPickerOpen(false)}
                />
              ) : null}
            </>
          ) : (
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <Field label="Quiz topic slug (platform adaptive quiz)">
                <input list="sm-quiz-slugs" value={quizTopicSlug} onChange={(e) => setQuizTopicSlug(e.target.value)} placeholder="e.g. section-1-numerical-ability--percentages" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <datalist id="sm-quiz-slugs">
                  {quizSlugs.map((t) => (
                    <option key={t.slug} value={t.slug}>
                      {t.name}
                    </option>
                  ))}
                </datalist>
              </Field>
              <Field label="# Questions">
                <input value={quizQuestionCount} onChange={(e) => setQuizQuestionCount(e.target.value.replace(/\D/g, ''))} className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </Field>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={busy || !title.trim()} className="inline-flex items-center gap-2 rounded-full bg-orange px-5 py-2 text-sm font-bold text-[#171717] disabled:opacity-50">
            {busy && <Loader2 className="size-4 animate-spin" />} {item ? 'Save' : 'Add item'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── small helpers ────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}
function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-50 hover:text-rose-500">
      {children}
    </button>
  );
}
function InlineText({ value, onSave, className }: { value: string; onSave: (v: string) => void; className?: string }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v.trim() && v !== value && onSave(v.trim())}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      className={cn('rounded-lg border border-transparent bg-transparent px-1.5 py-1 hover:border-slate-200 focus:border-orange focus:bg-white focus:outline-none', className)}
    />
  );
}
function AddInline({ placeholder, onAdd }: { placeholder: string; onAdd: (v: string) => void }) {
  const [v, setV] = useState('');
  const add = () => {
    if (v.trim()) {
      onAdd(v.trim());
      setV('');
    }
  };
  return (
    <div className="flex items-center gap-2">
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && add()}
        placeholder={placeholder}
        className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
      />
      {v.trim() && (
        <button type="button" onClick={add} className="rounded-full bg-slate-800 px-3 py-1.5 text-xs font-bold text-white">
          Add
        </button>
      )}
    </div>
  );
}
