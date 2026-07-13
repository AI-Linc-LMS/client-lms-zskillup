'use client';

import { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileUp, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApiRequestError } from '@/lib/api/types';
import { importAdminQuestions, type AdminImportResult } from '@/lib/api/admin';

/**
 * Bulk question import (Sprint 3). Upload or paste a CSV; the server parses it,
 * validates every row exactly like a single add, and returns a per-row outcome.
 * Mirrors the TPO bulk-invite UX so the two import flows feel consistent.
 */

const TEMPLATE = [
  'stem,type,difficulty,topic,company,hint,explanation,optionA,optionB,optionC,optionD,correct',
  'What is 15% of 200?,MCQ,EASY,percentages,,10% is 20,15% = 30,25,30,35,40,B',
  '"If A:B = 2:3 and B:C = 4:5, find A:C",MCQ,MEDIUM,percentages,,Chain the ratios,A:C = 8:15,8:15,2:5,3:5,8:5,A',
].join('\n');

const COLUMNS: Array<{ name: string; note: string }> = [
  { name: 'stem', note: 'required - the question text' },
  { name: 'type', note: 'MCQ or MULTI_SELECT (default MCQ)' },
  { name: 'difficulty', note: 'EASY / MEDIUM / HARD (default MEDIUM)' },
  { name: 'topic', note: 'required - topic slug, e.g. percentages' },
  { name: 'company', note: 'optional - company slug, e.g. tcs' },
  { name: 'hint, explanation', note: 'optional' },
  { name: 'optionA–optionD', note: 'option text (≥2 for choice questions)' },
  { name: 'correct', note: 'correct letter(s), e.g. B or A,C' },
];

export function QuestionImportPanel({ onDone }: { onDone: () => void }) {
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AdminImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zskillup-questions-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setCsv(await file.text());
    setResult(null);
  }

  async function doImport() {
    if (!csv.trim()) {
      setError('Add some CSV first - upload a file or paste rows below.');
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await importAdminQuestions(csv));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Import failed. Check the CSV format.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-navy">Bulk import questions</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Upload a CSV to publish many questions at once. Each row is validated independently -
            a bad row is reported, never blocks the rest.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="size-4" aria-hidden="true" /> Download CSV template
        </Button>
      </div>

      {/* Column reference */}
      <div className="rounded-lg bg-slate-50 p-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          CSV columns (header row required)
        </p>
        <ul className="grid gap-x-6 gap-y-1 text-xs text-slate-600 sm:grid-cols-2">
          {COLUMNS.map((c) => (
            <li key={c.name}>
              <span className="font-semibold text-navy">{c.name}</span>
              <span className="text-slate-400"> - {c.note}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Upload / paste */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={onFile}
            className="hidden"
          />
          <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
            <FileUp className="size-4" aria-hidden="true" /> Choose CSV file
          </Button>
          {fileName ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
              <CheckCircle2 className="size-4 text-emerald-500" aria-hidden="true" />
              {fileName}
            </span>
          ) : (
            <span className="text-sm text-slate-400">…or paste rows below</span>
          )}
        </div>

        <textarea
          value={csv}
          onChange={(e) => {
            setCsv(e.target.value);
            setFileName(null);
            setResult(null);
          }}
          rows={6}
          placeholder={TEMPLATE}
          spellCheck={false}
          className="w-full rounded-lg border border-slate-200 bg-white p-3 font-mono text-xs leading-relaxed text-navy placeholder:text-slate-300 focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
        />
      </div>

      {error ? (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      ) : null}

      {/* Result summary */}
      {result ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle2 className="size-4" aria-hidden="true" /> {result.created} created
            </span>
            {result.invalid > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-700 ring-1 ring-red-200">
                <AlertTriangle className="size-4" aria-hidden="true" /> {result.invalid} skipped
              </span>
            ) : null}
          </div>

          {result.rows.some((r) => r.status === 'invalid') ? (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Line</th>
                    <th className="px-3 py-2">Question</th>
                    <th className="px-3 py-2">Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows
                    .filter((r) => r.status === 'invalid')
                    .map((r) => (
                      <tr key={r.line} className="border-t border-slate-100">
                        <td className="px-3 py-2 text-slate-400">{r.line}</td>
                        <td className="px-3 py-2 text-slate-600">{r.stem}</td>
                        <td className="px-3 py-2">
                          <span className="text-red-600">{r.reason}</span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="flex items-center gap-1.5 text-sm text-emerald-700">
              <CheckCircle2 className="size-4" aria-hidden="true" /> Every row imported cleanly.
            </p>
          )}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
        {result ? (
          <Button onClick={onDone}>Done - view questions</Button>
        ) : (
          <Button onClick={doImport} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />}
            Import questions
          </Button>
        )}
      </div>
    </div>
  );
}
