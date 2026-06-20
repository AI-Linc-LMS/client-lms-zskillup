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
  onSubmitted,
}: {
  attemptId: string;
  question: ApiMockQuestion;
  saved?: ApiMockSavedCoding;
  onSubmitted: (r: { verdict: string; passed: number; total: number; isCorrect: boolean }) => void;
}) {
  const coding = question.coding!;
  const [languages, setLanguages] = useState<CodingLanguage[]>([]);
  const initialLang = saved?.language ?? Object.keys(coding.starterCode)[0] ?? 'python';
  const [language, setLanguage] = useState(initialLang);
  const [source, setSource] = useState(saved?.sourceCode ?? coding.starterCode[initialLang] ?? '');
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

  const onLangChange = (next: string) => {
    setLanguage(next);
    // Swap to that language's starter only if the user hasn't typed their own.
    if (!source.trim() || source === coding.starterCode[language]) {
      setSource(coding.starterCode[next] ?? '');
    }
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
          <p className="mt-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-600">Constraints: </span>
            {coding.constraints}
          </p>
        ) : null}
        {coding.sampleCases.length ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {coding.sampleCases.slice(0, 2).map((c, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs">
                <p className="font-semibold text-slate-500">Sample {i + 1}</p>
                <p className="mt-1 text-slate-400">Input</p>
                <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] text-navy">{c.input}</pre>
                <p className="mt-1 text-slate-400">Expected</p>
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
          <CodeEditor language={monaco} value={source} onChange={setSource} height="320px" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={run} disabled={running || submitting} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-navy hover:bg-slate-50 disabled:opacity-60">
          {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} Run sample
        </button>
        <button type="button" onClick={submit} disabled={submitting || running} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#f7a14e] to-[#f37021] px-4 py-2 text-sm font-extrabold text-white disabled:opacity-60">
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Submit solution
        </button>
        <span className="text-xs text-slate-400">Submitting records your latest solution; you can resubmit before the timer ends.</span>
      </div>

      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}

      {result ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-navy">
              {result.passed}/{result.total} tests passed
            </p>
            <span className={cn('text-xs font-bold', result.verdict === 'ACCEPTED' ? 'text-emerald-600' : 'text-amber-600')}>{result.verdict}</span>
          </div>
          {result.compileOutput ? (
            <pre className="mt-2 overflow-x-auto rounded-lg bg-red-50 p-2 font-mono text-[11px] text-red-700">{result.compileOutput}</pre>
          ) : null}
          <div className="mt-2 space-y-1.5">
            {result.cases.map((c) => (
              <div key={c.index} className={cn('flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs', c.passed ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50')}>
                <span className={cn('grid size-5 place-items-center rounded-full', c.passed ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white')}>
                  {c.passed ? <Check className="size-3" /> : <X className="size-3" />}
                </span>
                <span className="font-semibold text-slate-600">Test {c.index + 1}{c.hidden ? ' (hidden)' : ''}</span>
                {!c.hidden && c.actualOutput != null ? (
                  <span className="ml-auto truncate font-mono text-slate-400">→ {c.actualOutput.slice(0, 40)}</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
