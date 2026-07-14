'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FileText, Loader2, Plus, PlayCircle, ListChecks, Sparkles, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { listAdminCompanies, type AdminCompanyRow } from '@/lib/api/admin';
import { listTopicsWithCounts, type ApiTopic } from '@/lib/api/catalog';
import {
  createItem,
  createSection,
  createTopic,
  deleteItem,
  deleteSection,
  deleteTopic,
  generateStudyMaterialQuizzes,
  getAdminStudyMaterial,
  updateItem,
  updateSection,
  updateTopic,
  type AdminStudyMaterialDto,
  type AdminStudyMaterialItemDto,
  type ItemInput,
} from '@/lib/api/study-material-admin';
import type { StudyMaterialItemKind } from '@/shared/dto/study-material.dto';

const KIND_META: Record<StudyMaterialItemKind, { icon: typeof PlayCircle; label: string; cls: string }> = {
  VIDEO: { icon: PlayCircle, label: 'Video', cls: 'bg-[#fff5ea] text-[#f5b400]' },
  QUIZ: { icon: ListChecks, label: 'Quiz', cls: 'bg-amber-50 text-amber-600' },
  ARTICLE: { icon: FileText, label: 'Article', cls: 'bg-sky-50 text-sky-600' },
};

export function StudyMaterialAdmin() {
  const [companies, setCompanies] = useState<AdminCompanyRow[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [tree, setTree] = useState<AdminStudyMaterialDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState<ApiTopic[]>([]);
  const [newSection, setNewSection] = useState('');
  const [itemForm, setItemForm] = useState<{ topicId: string; item?: AdminStudyMaterialItemDto } | null>(null);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    listAdminCompanies()
      .then((cs) => {
        setCompanies(cs);
        if (cs[0]) setCompanyId(cs[0].id);
      })
      .catch(() => {});
    listTopicsWithCounts().then(setTopics).catch(() => {});
  }, []);

  const load = useCallback(() => {
    if (!companyId) return;
    setLoading(true);
    getAdminStudyMaterial(companyId)
      .then(setTree)
      .catch(() => setTree(null))
      .finally(() => setLoading(false));
  }, [companyId]);
  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      load();
    } finally {
      setBusy(false);
    }
  };

  const addSection = () => {
    const title = newSection.trim();
    if (!title || !companyId) return;
    setNewSection('');
    void run(() => createSection({ companyId, title }));
  };

  const quizSlugs = useMemo(() => topics.filter((t) => t.parentId).map((t) => ({ slug: t.slug, name: t.name })), [topics]);

  return (
    <div className="space-y-4">
      {/* Company picker */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Company</label>
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
        {tree && <span className="text-xs text-slate-500">{tree.sections.length} sections · edits show instantly on the student side</span>}
        {(loading || busy) && <Loader2 className="size-4 animate-spin text-slate-400" />}
        <button
          type="button"
          onClick={async () => {
            if (
              !companyId ||
              !confirm(
                "Regenerate this company's quiz sections from its real question bank? Auto-generated quizzes are replaced with fresh ones (your videos and hand-added sections are kept).",
              )
            )
              return;
            setGenerating(true);
            try {
              const r = await generateStudyMaterialQuizzes(companyId);
              load();
              alert(`Generated ${r.sections} sections · ${r.topics} topics · ${r.quizzes} quizzes from the question bank.`);
            } finally {
              setGenerating(false);
            }
          }}
          disabled={!companyId || generating}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-[#1f2d4d] to-[#0a0a0c] px-3.5 py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {generating ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          Auto-generate quizzes
        </button>
      </div>

      {/* Sections */}
      {tree && (
        <div className="space-y-3">
          {tree.sections.map((s) => (
            <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
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
                <IconBtn label="Delete section" onClick={() => confirm(`Delete section "${s.title}" and everything in it?`) && run(() => deleteSection(s.id))}>
                  <Trash2 className="size-4" />
                </IconBtn>
              </div>

              {/* Topics */}
              <div className="mt-3 space-y-2 border-l-2 border-slate-100 pl-3">
                {s.topics.map((t) => (
                  <div key={t.id} className="rounded-xl bg-slate-50/60 p-3">
                    <div className="flex items-center gap-2">
                      <InlineText value={t.title} onSave={(title) => run(() => updateTopic(t.id, { title }))} className="flex-1 text-sm font-bold text-navy" />
                      <button
                        type="button"
                        onClick={() => setItemForm({ topicId: t.id })}
                        className="inline-flex items-center gap-1 rounded-full bg-navy px-2.5 py-1 text-[11px] font-bold text-white hover:bg-navy/90"
                      >
                        <Plus className="size-3" /> Item
                      </button>
                      <IconBtn label="Delete topic" onClick={() => confirm(`Delete topic "${t.title}"?`) && run(() => deleteTopic(t.id))}>
                        <Trash2 className="size-3.5" />
                      </IconBtn>
                    </div>
                    {/* Items */}
                    <ul className="mt-2 space-y-1.5">
                      {t.items.map((it) => {
                        const m = KIND_META[it.kind];
                        const Icon = m.icon;
                        return (
                          <li key={it.id} className="flex items-center gap-2.5 rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100">
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

          {/* Add section */}
          <div className="flex items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white p-3">
            <input
              value={newSection}
              onChange={(e) => setNewSection(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSection()}
              placeholder="New section title (e.g. Numerical Ability)"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <button type="button" onClick={addSection} disabled={!newSection.trim()} className="inline-flex items-center gap-1.5 rounded-full bg-orange px-4 py-2 text-sm font-bold text-[#171717] disabled:opacity-50">
              <Plus className="size-4" /> Add section
            </button>
          </div>
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
                className={cn('flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition', kind === k ? 'border-[#ffc42d] bg-[#fff5ea] text-[#1a1d29]' : 'border-slate-200 text-slate-600 hover:border-slate-300')}
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
              <Field label={kind === 'VIDEO' ? 'Video link (Vimeo / Google Drive / YouTube)' : 'Article link'}>
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste the share link - provider is detected automatically" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </Field>
              {kind === 'VIDEO' && (
                <Field label="Duration label (optional)">
                  <input value={durationLabel} onChange={(e) => setDurationLabel(e.target.value)} placeholder="e.g. 24:15" className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </Field>
              )}
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
