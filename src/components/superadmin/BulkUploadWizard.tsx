'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FileUp,
  Loader2,
  Plus,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApiRequestError } from '@/lib/api/types';
import {
  bulkUploadQuestions,
  getQuestionTopicsTree,
} from '@/lib/api/admin';
import type {
  AdminBulkEnsureTopic,
  AdminBulkUploadItem,
  AdminBulkUploadResult,
  AdminTopicNode,
} from '@/shared/dto/admin-questions.dto';

/**
 * Section/Topic + Bulk Upload wizard (Admin + Super Admin). Four steps:
 *   1. Upload  — drop a CSV/XLSX (parsed here) or paste; download a template.
 *   2. Map     — assign a Section → Topic → Subtopic (pick existing or create new);
 *                a row's own section/topic/subtopic columns override the global pick.
 *   3. Fix     — validate every row server-side (dry run, no writes), edit bad cells
 *                inline, re-validate; import stays disabled until zero invalid rows.
 *   4. Import  — commit; new taxonomy + questions land in the bank with their mappings.
 */

const TYPES = ['MCQ', 'MULTI_SELECT', 'NUMERIC', 'CODING'] as const;
const DIFFS = ['EASY', 'MEDIUM', 'HARD'] as const;
const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

interface WizRow {
  section: string;
  topic: string;
  subtopic: string;
  type: string;
  difficulty: string;
  stem: string;
  answer: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE: string;
  optionF: string;
  correct: string;
  hint: string;
  explanation: string;
}

const EMPTY_ROW: WizRow = {
  section: '', topic: '', subtopic: '', type: '', difficulty: '', stem: '', answer: '',
  optionA: '', optionB: '', optionC: '', optionD: '', optionE: '', optionF: '',
  correct: '', hint: '', explanation: '',
};

const TEMPLATE_HEADERS = [
  'section', 'topic', 'subtopic', 'type', 'difficulty', 'stem', 'answer',
  'optionA', 'optionB', 'optionC', 'optionD', 'correct', 'hint', 'explanation',
];
const TEMPLATE_ROWS = [
  ['Quantitative Aptitude', 'Percentages', 'Basics', 'MCQ', 'EASY', 'What is 15% of 200?', '', '20', '30', '35', '40', 'B', '10% is 20', '15% = 30'],
  ['Programming', 'Arrays', '', 'CODING', 'MEDIUM', 'Write a function that adds two numbers.', 'return a + b', '', '', '', '', '', '', 'Sum of two ints'],
];

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Case-insensitive header lookup with a few common aliases. */
function pick(raw: Record<string, unknown>, keys: string[]): string {
  const norm = new Map<string, unknown>();
  for (const [k, v] of Object.entries(raw)) norm.set(k.trim().toLowerCase(), v);
  for (const k of keys) {
    const v = norm.get(k);
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function rowsFromWorkbook(wb: XLSX.WorkBook): WizRow[] {
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  return json.map((raw) => ({
    section: pick(raw, ['section']),
    topic: pick(raw, ['topic']),
    subtopic: pick(raw, ['subtopic', 'sub-topic', 'sub topic']),
    type: pick(raw, ['type']),
    difficulty: pick(raw, ['difficulty', 'level']),
    stem: pick(raw, ['stem', 'question', 'question text']),
    answer: pick(raw, ['answer', 'correct answer']),
    optionA: pick(raw, ['optiona', 'option a', 'option_a']),
    optionB: pick(raw, ['optionb', 'option b', 'option_b']),
    optionC: pick(raw, ['optionc', 'option c', 'option_c']),
    optionD: pick(raw, ['optiond', 'option d', 'option_d']),
    optionE: pick(raw, ['optione', 'option e', 'option_e']),
    optionF: pick(raw, ['optionf', 'option f', 'option_f']),
    correct: pick(raw, ['correct', 'correct option', 'answer key', 'key']),
    hint: pick(raw, ['hint']),
    explanation: pick(raw, ['explanation', 'solution']),
  }));
}

/** Flatten the tree into name→node lookups per level so we can reuse existing
 *  Section/Topic/Subtopic by name instead of creating duplicates. */
function childByName(nodes: AdminTopicNode[], name: string): AdminTopicNode | undefined {
  const n = name.trim().toLowerCase();
  return nodes.find((c) => c.name.trim().toLowerCase() === n);
}

/**
 * Resolve one row's Section→Topic→Subtopic to a leaf slug the question maps to,
 * collecting any brand-new nodes into `ensure` (deduped by slug). Returns null when
 * the required Section or Topic is missing (surfaced as a row error by the server).
 */
function resolveTaxonomy(
  tree: AdminTopicNode[],
  section: string,
  topic: string,
  subtopic: string,
  ensure: Map<string, AdminBulkEnsureTopic>,
): string | null {
  if (!section.trim() || !topic.trim()) return null;

  const secNode = childByName(tree, section);
  const secSlug = secNode?.slug ?? slugify(section);
  if (!secNode) ensure.set(secSlug, { slug: secSlug, name: section.trim() });

  const topNode = secNode ? childByName(secNode.children, topic) : undefined;
  const topSlug = topNode?.slug ?? `${secSlug}--${slugify(topic)}`;
  if (!topNode) ensure.set(topSlug, { slug: topSlug, name: topic.trim(), parentSlug: secSlug });

  if (!subtopic.trim()) return topSlug; // no subtopic → attach at the topic level

  const subNode = topNode ? childByName(topNode.children, subtopic) : undefined;
  const subSlug = subNode?.slug ?? `${topSlug}--${slugify(subtopic)}`;
  if (!subNode) ensure.set(subSlug, { slug: subSlug, name: subtopic.trim(), parentSlug: topSlug });
  return subSlug;
}

function buildPayload(
  rows: WizRow[],
  tree: AdminTopicNode[],
  g: { section: string; topic: string; subtopic: string },
): { ensureTopics: AdminBulkEnsureTopic[]; items: AdminBulkUploadItem[] } {
  const ensure = new Map<string, AdminBulkEnsureTopic>();
  const items = rows.map((r) => {
    const leaf = resolveTaxonomy(
      tree,
      r.section || g.section,
      r.topic || g.topic,
      r.subtopic || g.subtopic,
      ensure,
    );
    const type = r.type.trim().toUpperCase();
    const isChoice = type === 'MCQ' || type === 'MULTI_SELECT';
    const correctSet = new Set(
      r.correct.split(/[,\s]+/).map((s) => s.trim().toUpperCase()).filter(Boolean),
    );
    const options = isChoice
      ? OPTION_LETTERS.map((L) => ({ L, text: (r[`option${L}` as keyof WizRow] as string) || '' }))
          .filter((o) => o.text.trim() !== '')
          .map((o) => ({ text: o.text.trim(), isCorrect: correctSet.has(o.L) }))
      : undefined;
    return {
      type: type || undefined,
      difficulty: r.difficulty.trim().toUpperCase() || undefined,
      stem: r.stem.trim() || undefined,
      answer: r.answer.trim() || undefined,
      hint: r.hint.trim() || undefined,
      explanation: r.explanation.trim() || undefined,
      subtopicSlug: leaf ?? undefined,
      options,
    } satisfies AdminBulkUploadItem;
  });
  return { ensureTopics: [...ensure.values()], items };
}

export function BulkUploadWizard({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<'upload' | 'review' | 'done'>('upload');
  const [rows, setRows] = useState<WizRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [paste, setPaste] = useState('');
  const [tree, setTree] = useState<AdminTopicNode[]>([]);
  const [g, setG] = useState({ section: '', topic: '', subtopic: '' });
  const [validation, setValidation] = useState<AdminBulkUploadResult | null>(null);
  const [imported, setImported] = useState<AdminBulkUploadResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void getQuestionTopicsTree().then(setTree).catch(() => setTree([]));
  }, []);

  // Any edit invalidates the last validation — force a re-check before import.
  const invalidateValidation = () => setValidation(null);

  function loadRows(next: WizRow[]) {
    setRows(next);
    invalidateValidation();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      loadRows(rowsFromWorkbook(XLSX.read(buf, { type: 'array' })));
    } catch {
      setError('Could not read that file. Use a .csv or .xlsx exported from the template.');
    }
  }

  function loadPaste() {
    if (!paste.trim()) {
      setError('Paste some CSV rows first, or choose a file.');
      return;
    }
    setError(null);
    setFileName(null);
    try {
      loadRows(rowsFromWorkbook(XLSX.read(paste, { type: 'string' })));
    } catch {
      setError('Could not parse the pasted CSV — check the header row.');
    }
  }

  function downloadTemplate(kind: 'csv' | 'xlsx') {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...TEMPLATE_ROWS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Questions');
    XLSX.writeFile(wb, `zskillup-questions-template.${kind}`, { bookType: kind });
  }

  const editCell = (idx: number, key: keyof WizRow, value: string) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
    invalidateValidation();
  };

  const errorsByIndex = useMemo(() => {
    const m = new Map<number, string[]>();
    for (const r of validation?.rows ?? []) {
      if (r.status === 'invalid') m.set(r.index, r.errors.map((e) => `${e.field}: ${e.message}`));
    }
    return m;
  }, [validation]);

  async function validate() {
    setBusy(true);
    setError(null);
    try {
      const { ensureTopics, items } = buildPayload(rows, tree, g);
      setValidation(await bulkUploadQuestions({ dryRun: true, ensureTopics, items }));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Validation failed.');
    } finally {
      setBusy(false);
    }
  }

  async function runImport() {
    setBusy(true);
    setError(null);
    try {
      const { ensureTopics, items } = buildPayload(rows, tree, g);
      const res = await bulkUploadQuestions({ dryRun: false, ensureTopics, items });
      setImported(res);
      setStep('done');
      void getQuestionTopicsTree().then(setTree).catch(() => {});
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  }

  const validated = validation !== null;
  const invalidCount = validation?.summary.invalid ?? 0;
  const canImport = validated && invalidCount === 0 && rows.length > 0;

  return (
    <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Bulk upload
          </p>
          <h2 className="text-base font-bold text-navy">Import questions from a spreadsheet</h2>
          <p className="mt-0.5 text-sm text-slate-600">
            Upload a CSV or Excel file, map it to a Section / Topic / Subtopic, fix anything flagged,
            then import. New sections and topics can be created as you go.
          </p>
        </div>
        <StepDots step={step} />
      </div>

      {error ? (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      ) : null}

      {/* ── Step 1: Upload ── */}
      {step === 'upload' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => downloadTemplate('csv')}>
              <Download className="size-4" /> CSV template
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadTemplate('xlsx')}>
              <Download className="size-4" /> Excel template
            </Button>
          </div>

          <div className="rounded-lg bg-slate-50 p-4 text-xs text-slate-600">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Columns (header row required, order-independent)
            </p>
            <p>
              <span className="font-semibold text-navy">section, topic</span> (required),{' '}
              <span className="font-semibold text-navy">subtopic</span> (optional),{' '}
              <span className="font-semibold text-navy">type</span> (MCQ / MULTI_SELECT / NUMERIC /
              CODING), <span className="font-semibold text-navy">difficulty</span> (EASY / MEDIUM /
              HARD), <span className="font-semibold text-navy">stem</span> (required),{' '}
              <span className="font-semibold text-navy">answer</span> (NUMERIC / CODING),{' '}
              <span className="font-semibold text-navy">optionA–optionF</span> +{' '}
              <span className="font-semibold text-navy">correct</span> (e.g. B or A,C for choice
              questions), <span className="font-semibold text-navy">hint, explanation</span>{' '}
              (optional). Leave section/topic blank in the file to set them for all rows on the next
              step.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv"
              onChange={onFile}
              className="hidden"
            />
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
              <FileUp className="size-4" /> Choose CSV / Excel
            </Button>
            {fileName ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                <CheckCircle2 className="size-4 text-emerald-500" /> {fileName}
              </span>
            ) : (
              <span className="text-sm text-slate-500">…or paste CSV below</span>
            )}
          </div>

          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={5}
            spellCheck={false}
            placeholder={[TEMPLATE_HEADERS.join(','), ...TEMPLATE_ROWS.map((r) => r.join(','))].join('\n')}
            className="w-full rounded-lg border border-slate-200 bg-white p-3 font-mono text-xs leading-relaxed text-navy placeholder:text-slate-400 focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
          />
          {paste.trim() && rows.length === 0 ? (
            <Button variant="outline" size="sm" onClick={loadPaste}>
              Parse pasted rows
            </Button>
          ) : null}

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-sm text-slate-500">
              {rows.length > 0 ? `${rows.length} row${rows.length === 1 ? '' : 's'} parsed` : 'No rows yet'}
            </span>
            <Button onClick={() => setStep('review')} disabled={rows.length === 0}>
              Next: map &amp; review <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {/* ── Step 2 + 3: Map, validate & fix ── */}
      {step === 'review' ? (
        <div className="space-y-4">
          <TaxonomyAssigner tree={tree} value={g} onChange={(v) => { setG(v); invalidateValidation(); }} />

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => void validate()} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Validate {rows.length} row{rows.length === 1 ? '' : 's'}
            </Button>
            {validated ? (
              invalidCount === 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  <CheckCircle2 className="size-4" /> All {rows.length} rows valid
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-700 ring-1 ring-red-200">
                  <AlertTriangle className="size-4" /> {invalidCount} row{invalidCount === 1 ? '' : 's'} need fixing
                </span>
              )
            ) : (
              <span className="text-xs text-slate-500">Validate to check every row before importing.</span>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-2 py-2">#</th>
                  <th className="px-2 py-2">Type</th>
                  <th className="px-2 py-2">Diff</th>
                  <th className="px-2 py-2 min-w-[220px]">Stem</th>
                  <th className="px-2 py-2 min-w-[220px]">Options (A|B|C|D) &amp; correct</th>
                  <th className="px-2 py-2">Answer</th>
                  <th className="px-2 py-2 min-w-[160px]">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const errs = errorsByIndex.get(i);
                  const bad = validated && !!errs;
                  const ok = validated && !errs;
                  return (
                    <tr key={i} className={'border-t border-slate-100 align-top ' + (bad ? 'bg-red-50/40' : '')}>
                      <td className="px-2 py-2 text-slate-400">{i + 1}</td>
                      <td className="px-2 py-2">
                        <select value={r.type} onChange={(e) => editCell(i, 'type', e.target.value)} className={cellCls}>
                          <option value="">—</option>
                          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <select value={r.difficulty} onChange={(e) => editCell(i, 'difficulty', e.target.value)} className={cellCls}>
                          <option value="">—</option>
                          {DIFFS.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <textarea value={r.stem} onChange={(e) => editCell(i, 'stem', e.target.value)} rows={2} className={cellCls + ' w-full resize-y'} />
                      </td>
                      <td className="px-2 py-2">
                        <div className="grid grid-cols-2 gap-1">
                          {(['A', 'B', 'C', 'D'] as const).map((L) => (
                            <input
                              key={L}
                              value={r[`option${L}` as keyof WizRow] as string}
                              onChange={(e) => editCell(i, `option${L}` as keyof WizRow, e.target.value)}
                              placeholder={L}
                              className={cellCls + ' w-full'}
                            />
                          ))}
                        </div>
                        <input
                          value={r.correct}
                          onChange={(e) => editCell(i, 'correct', e.target.value)}
                          placeholder="correct e.g. B"
                          className={cellCls + ' mt-1 w-full'}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input value={r.answer} onChange={(e) => editCell(i, 'answer', e.target.value)} className={cellCls + ' w-full'} />
                      </td>
                      <td className="px-2 py-2">
                        {!validated ? (
                          <span className="text-slate-400">not checked</span>
                        ) : ok ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="size-3.5" /> valid</span>
                        ) : (
                          <ul className="space-y-0.5 text-red-600">
                            {errs!.map((m, k) => <li key={k}>• {m}</li>)}
                          </ul>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <Button variant="ghost" size="sm" onClick={() => setStep('upload')}>
              <ArrowLeft className="size-4" /> Back
            </Button>
            <Button onClick={() => void runImport()} disabled={!canImport || busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Import {rows.length} question{rows.length === 1 ? '' : 's'}
            </Button>
          </div>
          {validated && invalidCount > 0 ? (
            <p className="text-xs text-slate-500">Fix the flagged rows above, then Validate again — import unlocks when every row is valid.</p>
          ) : null}
        </div>
      ) : null}

      {/* ── Step 4: Done ── */}
      {step === 'done' && imported ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle2 className="size-4" /> {imported.summary.created} imported
            </span>
            {imported.summary.topicsCreated > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700 ring-1 ring-sky-200">
                <Plus className="size-4" /> {imported.summary.topicsCreated} section/topic created
              </span>
            ) : null}
            {imported.summary.skipped > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">
                {imported.summary.skipped} skipped (already existed)
              </span>
            ) : null}
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <Button onClick={onDone}>Done — view questions</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const cellCls =
  'rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-navy focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30';

function StepDots({ step }: { step: 'upload' | 'review' | 'done' }) {
  const order = ['upload', 'review', 'done'] as const;
  const labels: Record<typeof order[number], string> = { upload: 'Upload', review: 'Map & fix', done: 'Import' };
  const active = order.indexOf(step);
  return (
    <div className="flex items-center gap-2">
      {order.map((s, i) => (
        <span
          key={s}
          className={
            'rounded-full px-2.5 py-0.5 text-[11px] font-semibold ' +
            (i <= active ? 'bg-navy text-white' : 'bg-slate-100 text-slate-500')
          }
        >
          {i + 1}. {labels[s]}
        </span>
      ))}
    </div>
  );
}

/** Global Section → Topic → Subtopic assignment: pick an existing node at each
 *  level, or type a new name to create it. Applies to rows whose own
 *  section/topic/subtopic columns are blank. */
function TaxonomyAssigner({
  tree,
  value,
  onChange,
}: {
  tree: AdminTopicNode[];
  value: { section: string; topic: string; subtopic: string };
  onChange: (v: { section: string; topic: string; subtopic: string }) => void;
}) {
  const sectionNode = childByName(tree, value.section);
  const topicNode = sectionNode ? childByName(sectionNode.children, value.topic) : undefined;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        Map to Section → Topic → Subtopic
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <PickOrCreate
          label="Section"
          options={tree.map((n) => n.name)}
          value={value.section}
          onChange={(v) => onChange({ section: v, topic: '', subtopic: '' })}
        />
        <PickOrCreate
          label="Topic"
          options={(sectionNode?.children ?? []).map((n) => n.name)}
          value={value.topic}
          onChange={(v) => onChange({ ...value, topic: v, subtopic: '' })}
          hint={sectionNode ? undefined : 'new section — type a topic'}
        />
        <PickOrCreate
          label="Subtopic (optional)"
          options={(topicNode?.children ?? []).map((n) => n.name)}
          value={value.subtopic}
          onChange={(v) => onChange({ ...value, subtopic: v })}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        A row with its own section/topic/subtopic columns keeps those; this fills the rest. New names
        are created on import.
      </p>
    </div>
  );
}

function PickOrCreate({
  label,
  options,
  value,
  onChange,
  hint,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  const [creating, setCreating] = useState(false);
  const isNew = value.trim() !== '' && !options.some((o) => o.toLowerCase() === value.trim().toLowerCase());
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-500">{label}</label>
      {creating || isNew || options.length === 0 ? (
        <div className="mt-1 flex items-center gap-1">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={hint ?? 'Type a new name'}
            className={cellCls + ' h-9 w-full'}
          />
          {options.length > 0 ? (
            <button type="button" onClick={() => { setCreating(false); onChange(''); }} className="text-xs font-semibold text-slate-400 hover:text-navy">
              pick
            </button>
          ) : null}
        </div>
      ) : (
        <div className="mt-1 flex items-center gap-1">
          <select value={value} onChange={(e) => onChange(e.target.value)} className={cellCls + ' h-9 w-full'}>
            <option value="">—</option>
            {options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <button type="button" onClick={() => { setCreating(true); onChange(''); }} className="inline-flex items-center text-xs font-semibold text-orange hover:underline">
            <Plus className="size-3.5" /> new
          </button>
        </div>
      )}
      {isNew ? <p className="mt-0.5 text-[10px] font-semibold text-orange">will be created</p> : null}
    </div>
  );
}
