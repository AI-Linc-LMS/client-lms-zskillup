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
  FolderTree,
  Loader2,
  Plus,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApiRequestError } from '@/lib/api/types';
import { visibleRoots } from '@/components/superadmin/TaxonomyPicker';
import { bulkUploadQuestions, getQuestionTopicsTree } from '@/lib/api/admin';
import type {
  AdminBulkUploadItemDto,
  AdminBulkUploadResolvedNodeDto,
  AdminBulkUploadResultDto,
  AdminBulkUploadRowResult,
  AdminTopicNodeDto,
} from '@/shared/dto/admin-questions.dto';

/**
 * Section/Topic + Bulk Upload wizard (Admin + Super Admin). Four steps:
 *   1. Upload  — drop a CSV/XLSX (parsed here) or paste; download a template.
 *   2. Map     — assign a Section → Topic → Subtopic for the whole file, and override it
 *                per row; the table shows exactly where each row will land.
 *   3. Fix     — validate every row server-side (dry run, no writes), edit bad cells
 *                inline, re-validate; import stays disabled until zero invalid rows.
 *   4. Import  — commit; new taxonomy + questions land in the bank with their mappings.
 *
 * TAXONOMY IS RESOLVED ON THE SERVER, BY NAME. This used to be done here: `resolveTaxonomy`
 * built `section--topic--subtopic` slugs in the browser and returned NULL whenever Section
 * or Topic was blank. The payload then carried `subtopicSlug: undefined`, the server only
 * validated the taxonomy `if (item.subtopicSlug)`, and the row was reported VALID — so the
 * question was created with `subtopic_id = NULL` and showed a DASH under Topic in the bank.
 * Client-built slugs also broke two other ways: one over 120 characters 400'd the whole
 * batch, and a guessed slug that happened to exist silently attached the rows to an
 * unrelated node. Now the wizard sends NAMES and the server does the matching
 * (case-insensitive, parent-scoped), mints slugs, and reports per row where it landed.
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

const TEMPLATE_HEADERS = [
  'section', 'topic', 'subtopic', 'type', 'difficulty', 'stem', 'answer',
  'optionA', 'optionB', 'optionC', 'optionD', 'correct', 'hint', 'explanation',
];
const TEMPLATE_ROWS = [
  ['Quantitative Aptitude', 'Percentages', 'Basics', 'MCQ', 'EASY', 'What is 15% of 200?', '', '20', '30', '35', '40', 'B', '10% is 20', '15% = 30'],
  ['Programming', 'Arrays', '', 'CODING', 'MEDIUM', 'Write a function that adds two numbers.', 'return a + b', '', '', '', '', '', '', 'Sum of two ints'],
];

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
    // Taxonomy headers accept the names real exports actually use. `section`/`topic` had
    // NO aliases, so a sheet headed "Category"/"Chapter" silently produced unfiled rows.
    section: pick(raw, ['section', 'section name', 'section_name', 'category', 'subject', 'area']),
    topic: pick(raw, ['topic', 'topic name', 'topic_name', 'chapter', 'concept']),
    subtopic: pick(raw, [
      'subtopic', 'sub-topic', 'sub topic', 'subtopic name', 'subtopic_name', 'sub_topic',
    ]),
    type: pick(raw, ['type', 'question type', 'question_type']),
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

/** Find a child by display name, case-insensitively — the same rule the server applies. */
function childByName(nodes: AdminTopicNodeDto[], name: string): AdminTopicNodeDto | undefined {
  const n = name.trim().toLowerCase();
  if (!n) return undefined;
  return nodes.find((c) => c.name.trim().toLowerCase() === n);
}

/**
 * The upload payload. Taxonomy travels as NAMES — no slugs are built here. A row that
 * leaves a column blank inherits the file-wide value, exactly as the server does.
 */
function buildItems(
  rows: WizRow[],
  g: { section: string; topic: string; subtopic: string },
): AdminBulkUploadItemDto[] {
  return rows.map((r) => {
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
      sectionName: (r.section || g.section).trim() || undefined,
      topicName: (r.topic || g.topic).trim() || undefined,
      subtopicName: (r.subtopic || g.subtopic).trim() || undefined,
      options,
    } satisfies AdminBulkUploadItemDto;
  });
}

export function BulkUploadWizard({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<'upload' | 'review' | 'done'>('upload');
  const [rows, setRows] = useState<WizRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [paste, setPaste] = useState('');
  const [tree, setTree] = useState<AdminTopicNodeDto[]>([]);
  const [g, setG] = useState({ section: '', topic: '', subtopic: '' });
  const [validation, setValidation] = useState<AdminBulkUploadResultDto | null>(null);
  const [imported, setImported] = useState<AdminBulkUploadResultDto | null>(null);
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

  const resultByIndex = useMemo(() => {
    const m = new Map<number, AdminBulkUploadRowResult>();
    for (const r of validation?.rows ?? []) m.set(r.index, r);
    return m;
  }, [validation]);

  async function validate() {
    setBusy(true);
    setError(null);
    try {
      setValidation(
        await bulkUploadQuestions({
          dryRun: true,
          defaultSectionName: g.section.trim() || undefined,
          defaultTopicName: g.topic.trim() || undefined,
          defaultSubtopicName: g.subtopic.trim() || undefined,
          items: buildItems(rows, g),
        }),
      );
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
      const res = await bulkUploadQuestions({
        dryRun: false,
        defaultSectionName: g.section.trim() || undefined,
        defaultTopicName: g.topic.trim() || undefined,
        defaultSubtopicName: g.subtopic.trim() || undefined,
        items: buildItems(rows, g),
      });
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
  const unfiledCount = validation?.summary.unfiled ?? 0;
  const canImport = validated && invalidCount === 0 && unfiledCount === 0 && rows.length > 0;

  // Datalists let a cell offer the names that already exist while still accepting a new
  // one — the server treats an unknown name as "create it", so both work.
  const sectionOptions = useMemo(() => visibleRoots(tree, false), [tree]);

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

          <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-sm">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Columns (header row required, order-independent)
            </p>
            <p>
              <span className="font-semibold text-navy">section, topic</span> (required —{' '}
              <span className="font-semibold text-navy">category / subject</span> and{' '}
              <span className="font-semibold text-navy">chapter / concept</span> also work),{' '}
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

          {validated && unfiledCount > 0 ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50/70 p-5"
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-red-700">
                Import blocked
              </p>
              <h3 className="text-base font-bold text-navy">
                {unfiledCount} row{unfiledCount === 1 ? ' has' : 's have'} no Section and Topic
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                A question with no topic never appears in a topic picker and shows a dash under
                Topic in the bank. Fill the Section and Topic cells below, or set them for the whole
                file above — then validate again.
              </p>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-2 py-2">#</th>
                  <th className="px-2 py-2 min-w-[300px]">Section / Topic / Subtopic</th>
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
                  const result = resultByIndex.get(i);
                  const errs = result?.status === 'invalid' ? result.errors : undefined;
                  const bad = validated && !!errs;
                  const ok = validated && !!result && !errs;
                  // Resolve against the SAME list the datalists are built from, so a
                  // `list=` never points at an id that was filtered out.
                  const section = childByName(sectionOptions, r.section || g.section);
                  const topic = section ? childByName(section.children, r.topic || g.topic) : undefined;
                  return (
                    <tr key={i} className={'border-t border-slate-100 align-top ' + (bad ? 'bg-red-50/40' : '')}>
                      <td className="px-2 py-2 text-slate-400">{i + 1}</td>
                      <td className="px-2 py-2">
                        <div className="space-y-1">
                          <input
                            value={r.section}
                            onChange={(e) => editCell(i, 'section', e.target.value)}
                            placeholder={g.section || 'Section'}
                            aria-label={`Section for row ${i + 1}`}
                            list="bulk-sections"
                            className={cellCls + ' w-full'}
                          />
                          <input
                            value={r.topic}
                            onChange={(e) => editCell(i, 'topic', e.target.value)}
                            placeholder={g.topic || 'Topic'}
                            aria-label={`Topic for row ${i + 1}`}
                            list={section ? `bulk-topics-${section.id}` : undefined}
                            className={cellCls + ' w-full'}
                          />
                          <input
                            value={r.subtopic}
                            onChange={(e) => editCell(i, 'subtopic', e.target.value)}
                            placeholder={g.subtopic || 'Subtopic (optional)'}
                            aria-label={`Subtopic for row ${i + 1}`}
                            list={topic ? `bulk-subtopics-${topic.id}` : undefined}
                            className={cellCls + ' w-full'}
                          />
                          {result ? <Placement result={result} /> : null}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <select value={r.type} onChange={(e) => editCell(i, 'type', e.target.value)} aria-label={`Type for row ${i + 1}`} className={cellCls}>
                          <option value="">—</option>
                          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <select value={r.difficulty} onChange={(e) => editCell(i, 'difficulty', e.target.value)} aria-label={`Difficulty for row ${i + 1}`} className={cellCls}>
                          <option value="">—</option>
                          {DIFFS.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <textarea value={r.stem} onChange={(e) => editCell(i, 'stem', e.target.value)} aria-label={`Question text for row ${i + 1}`} rows={2} className={cellCls + ' w-full resize-y'} />
                      </td>
                      <td className="px-2 py-2">
                        <div className="grid grid-cols-2 gap-1">
                          {(['A', 'B', 'C', 'D'] as const).map((L) => (
                            <input
                              key={L}
                              value={r[`option${L}` as keyof WizRow] as string}
                              onChange={(e) => editCell(i, `option${L}` as keyof WizRow, e.target.value)}
                              placeholder={L}
                              aria-label={`Option ${L} for row ${i + 1}`}
                              className={cellCls + ' w-full'}
                            />
                          ))}
                        </div>
                        <input
                          value={r.correct}
                          onChange={(e) => editCell(i, 'correct', e.target.value)}
                          placeholder="correct e.g. B"
                          aria-label={`Correct option for row ${i + 1}`}
                          className={cellCls + ' mt-1 w-full'}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input value={r.answer} onChange={(e) => editCell(i, 'answer', e.target.value)} aria-label={`Answer for row ${i + 1}`} className={cellCls + ' w-full'} />
                      </td>
                      <td className="px-2 py-2">
                        {!validated ? (
                          <span className="text-slate-400">not checked</span>
                        ) : ok ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="size-3.5" /> valid</span>
                        ) : (
                          <ul className="space-y-0.5 text-red-600">
                            {(errs ?? []).map((e, k) => <li key={k}>• {e.field}: {e.message}</li>)}
                          </ul>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Name suggestions per level. A name that isn't listed is simply a new node. */}
          <datalist id="bulk-sections">
            {sectionOptions.map((n) => <option key={n.id} value={n.name} />)}
          </datalist>
          {sectionOptions.map((s) => (
            <datalist key={s.id} id={`bulk-topics-${s.id}`}>
              {s.children.map((t) => <option key={t.id} value={t.name} />)}
            </datalist>
          ))}
          {sectionOptions.flatMap((s) =>
            s.children.map((t) => (
              <datalist key={t.id} id={`bulk-subtopics-${t.id}`}>
                {t.children.map((sub) => <option key={sub.id} value={sub.name} />)}
              </datalist>
            )),
          )}

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
          <ImportedPlacements result={imported} />
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <Button onClick={onDone}>Done — view questions</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const cellCls =
  'rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-navy placeholder:text-slate-400 focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30';

/** "→ Quant › Percentages › Basics", with the levels the import will CREATE called out. */
function Placement({ result }: { result: AdminBulkUploadRowResult }) {
  const levels = [result.resolvedSection, result.resolvedTopic, result.resolvedSubtopic].filter(
    (n): n is AdminBulkUploadResolvedNodeDto => !!n,
  );
  if (levels.length === 0) {
    return (
      <p className="text-[11px] font-semibold text-red-600">Not filed under any topic</p>
    );
  }
  return (
    <p className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
      <FolderTree className="size-3" aria-hidden="true" />
      {levels.map((n, i) => (
        <span key={`${n.name}-${i}`} className={n.isNew ? 'font-semibold text-orange' : 'text-slate-600'}>
          {i > 0 ? '› ' : ''}
          {n.name}
          {n.isNew ? ' (new)' : ''}
        </span>
      ))}
    </p>
  );
}

/** Where the imported rows actually landed, grouped — proof the taxonomy stuck. */
function ImportedPlacements({ result }: { result: AdminBulkUploadResultDto }) {
  const groups = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of result.rows) {
      if (r.status !== 'created') continue;
      const path = [r.resolvedSection, r.resolvedTopic, r.resolvedSubtopic]
        .filter((n): n is AdminBulkUploadResolvedNodeDto => !!n)
        .map((n) => n.name)
        .join(' › ');
      const key = path || 'Not filed under any topic';
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [result]);

  if (groups.length === 0) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        Filed under
      </p>
      <ul className="space-y-1">
        {groups.map(([path, n]) => (
          <li key={path} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-slate-600">{path}</span>
            <span className="font-semibold text-navy">{n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

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

/** File-wide Section → Topic → Subtopic: pick an existing node at each level, or type a new
 *  name to create it. Applies to rows whose own section/topic/subtopic cells are blank. */
function TaxonomyAssigner({
  tree,
  value,
  onChange,
}: {
  tree: AdminTopicNodeDto[];
  value: { section: string; topic: string; subtopic: string };
  onChange: (v: { section: string; topic: string; subtopic: string }) => void;
}) {
  // The `*-ai` / `ai-practice-topics` scratch roots are never a sensible import target.
  const roots = useMemo(() => visibleRoots(tree, false), [tree]);
  const sectionNode = childByName(roots, value.section);
  const topicNode = sectionNode ? childByName(sectionNode.children, value.topic) : undefined;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        Map the whole file to Section → Topic → Subtopic
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <PickOrCreate
          label="Section"
          options={roots.map((n) => n.name)}
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
        A row with its own Section/Topic/Subtopic cells keeps those; this fills the rest. New names
        are created on import, with a slug the server generates.
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
            aria-label={label}
            className={cellCls + ' h-9 w-full'}
          />
          {options.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setCreating(false); onChange(''); }}
            >
              pick
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="mt-1 flex items-center gap-1">
          <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className={cellCls + ' h-9 w-full'}>
            <option value="">—</option>
            {options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto px-0"
            onClick={() => { setCreating(true); onChange(''); }}
          >
            <Plus aria-hidden="true" /> new
          </Button>
        </div>
      )}
      {isNew ? <p className="mt-0.5 text-[10px] font-semibold text-orange">will be created</p> : null}
    </div>
  );
}
