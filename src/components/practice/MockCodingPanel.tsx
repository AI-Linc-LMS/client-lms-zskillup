'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Play, Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CodeEditor } from '@/components/coding/CodeEditor';
import { getCodingLanguages, runCodingSample, type CodingLanguage } from '@/lib/api/coding';
import { submitMockCode, type ApiMockCodeResult, type ApiMockQuestion, type ApiMockSavedCoding } from '@/lib/api/mocks';

/**
 * In-mock coding question — statement + editor + run-sample / submit. The
 * submission is graded on Judge0 server-side and recorded against the attempt;
 * the final mock score counts an ACCEPTED verdict as one correct question.
 */
export function MockCodingPanel({
  attemptId,
  question,
  saved,
  draft,
  onDraftChange,
  onSubmitted,
}: {
  attemptId: string;
  question: ApiMockQuestion;
  saved?: ApiMockSavedCoding;
  /** Per-problem unsaved editor draft, preserved across navigation by the parent. */
  draft?: { source: string; language: string };
  onDraftChange?: (d: { source: string; language: string }) => void;
  onSubmitted: (r: { verdict: string; passed: number; total: number; isCorrect: boolean }) => void;
}) {
  const coding = question.coding!;
  const [languages, setLanguages] = useState<CodingLanguage[]>([]);
  // Priority: live draft (unsaved edits) → last submitted solution → starter.
  const initialLang = draft?.language ?? saved?.language ?? Object.keys(coding.starterCode)[0] ?? 'python';
  const [language, setLanguage] = useState(initialLang);
  const [source, setSource] = useState(draft?.source ?? saved?.sourceCode ?? coding.starterCode[initialLang] ?? '');
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ApiMockCodeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<string | null>(saved?.verdict ?? null);

  useEffect(() => {
    getCodingLanguages().then((r) => setLanguages(r.languages)).catch(() => {});
  }, []);

  const monaco = useMemo(
    () => languages.find((l) => l.name === language)?.monaco ?? language,
    [languages, language],
  );

  // Mirror editor edits into the parent-held draft so unsaved code survives
  // navigating to another problem and back.
  const updateSource = (next: string) => {
    setSource(next);
    onDraftChange?.({ source: next, language });
  };

  const onLangChange = (next: string) => {
    setLanguage(next);
    // Swap to that language's starter only if the user hasn't typed their own.
    let nextSource = source;
    if (!source.trim() || source === coding.starterCode[language]) {
      nextSource = coding.starterCode[next] ?? '';
      setSource(nextSource);
    }
    onDraftChange?.({ source: nextSource, language: next });
  };

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const r = await runCodingSample(coding.slug, language, source);
      setResult(r as unknown as ApiMockCodeResult);
      setVerdict(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not run your code.');
    } finally {
      setRunning(false);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const r = await submitMockCode(attemptId, { problemId: question.id, language, source });
      setResult(r);
      setVerdict(r.verdict);
      onSubmitted({ verdict: r.verdict, passed: r.passed, total: r.total, isCorrect: r.verdict === 'ACCEPTED' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit your solution.');
    } finally {
      setSubmitting(false);
    }
  };

  const accepted = verdict === 'ACCEPTED';

  return (
    <div className="mt-4 space-y-4">
      {/* Statement */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{coding.statement}</p>
        {coding.constraints ? (
          <p className="mt-2 text-xs text-slate-600">
            <span className="font-semibold text-slate-600">Constraints: </span>
            {coding.constraints}
          </p>
        ) : null}
        {coding.sampleCases.length ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {coding.sampleCases.slice(0, 2).map((c, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs">
                <p className="font-semibold text-slate-600">Sample {i + 1}</p>
                <p className="mt-1 text-slate-500">Input</p>
                <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] text-navy">{c.input}</pre>
                <p className="mt-1 text-slate-500">Expected</p>
                <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] text-navy">{c.expectedOutput}</pre>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Editor */}
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
          <select
            value={language}
            onChange={(e) => onLangChange(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-navy"
          >
            {(languages.length ? languages.map((l) => ({ v: l.name, l: l.label })) : Object.keys(coding.starterCode).map((k) => ({ v: k, l: k }))).map((o) => (
              <option key={o.v} value={o.v}>{o.l}</option>
            ))}
          </select>
          {verdict ? (
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1', accepted ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-amber-200')}>
              {accepted ? <Check className="size-3" /> : <X className="size-3" />} {verdict}
            </span>
          ) : null}
        </div>
        <div className="h-[320px] bg-navy">
          <CodeEditor language={monaco} value={source} onChange={updateSource} height="320px" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={run} disabled={running || submitting} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-navy hover:bg-slate-50 disabled:opacity-60">
          {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} Run sample
        </button>
        <button type="button" onClick={submit} disabled={submitting || running} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ffd24d] to-[#f5b400] px-4 py-2 text-sm font-extrabold text-[#171717] disabled:opacity-60">
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Submit solution
        </button>
        <span className="text-xs text-slate-500">Submitting records your latest solution; you can resubmit before the timer ends.</span>
      </div>

      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}

      {result ? (
        (() => {
          const accepted = result.verdict === 'ACCEPTED';
          const tone = accepted
            ? { bar: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200', label: 'Accepted' }
            : result.verdict === 'COMPILE_ERROR'
              ? { bar: 'bg-rose-500', chip: 'bg-rose-50 text-rose-700 ring-rose-200', label: 'Compile error' }
              : result.verdict === 'WRONG_ANSWER'
                ? { bar: 'bg-rose-500', chip: 'bg-rose-50 text-rose-700 ring-rose-200', label: 'Wrong answer' }
                : { bar: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700 ring-amber-200', label: result.verdict.replace(/_/g, ' ').toLowerCase() };
          const pct = result.total ? Math.round((result.passed / result.total) * 100) : 0;
          return (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              {/* verdict header */}
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className={cn('grid size-9 place-items-center rounded-full text-white', tone.bar)}>
                    {accepted ? <Check className="size-5" /> : <X className="size-5" />}
                  </span>
                  <div>
                    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide capitalize ring-1 ring-inset', tone.chip)}>
                      {tone.label}
                    </span>
                    <p className="mt-0.5 text-sm font-bold text-navy">{result.passed}/{result.total} tests passed</p>
                  </div>
                </div>
                <span className={cn('text-2xl font-black tabular-nums', accepted ? 'text-emerald-600' : 'text-rose-500')}>{pct}%</span>
              </div>
              {result.compileOutput ? (
                <pre className="m-3 overflow-x-auto rounded-lg bg-rose-50 p-2.5 font-mono text-[11px] leading-relaxed text-rose-700">{result.compileOutput}</pre>
              ) : null}
              <div className="space-y-1.5 p-3">
                {result.cases.map((c) => (
                  <div key={c.index} className={cn('flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs', c.passed ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50')}>
                    <span className={cn('grid size-5 shrink-0 place-items-center rounded-full text-white', c.passed ? 'bg-emerald-500' : 'bg-rose-500')}>
                      {c.passed ? <Check className="size-3" /> : <X className="size-3" />}
                    </span>
                    <span className="font-semibold text-slate-600">Test {c.index + 1}{c.hidden ? ' · hidden' : ''}</span>
                    {!c.hidden && c.actualOutput != null ? (
                      <span className="ml-auto truncate font-mono text-[11px] text-slate-500">got: {c.actualOutput.slice(0, 36) || '∅'}</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          );
        })()
      ) : null}
    </div>
  );
}
