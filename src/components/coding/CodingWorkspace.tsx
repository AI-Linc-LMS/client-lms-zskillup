'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  CircleSlash,
  Loader2,
  Play,
  RotateCcw,
  Send,
  XCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  getCodingLanguages,
  getCodingProblem,
  runCodingSample,
  submitCoding,
  type CodingLanguage,
  type CodingProblem,
  type CodingResult,
} from '@/lib/api/coding';
import type { GamificationSummary } from '@/lib/api/gamification-types';
import { ApiRequestError } from '@/lib/api/types';
import { PaywallCard } from '@/components/billing/PaywallCard';
import type { AdaptivePaywall } from '@/lib/api/adaptive';
import { RewardOverlay } from '@/components/gamification/RewardOverlay';
import { notifyXpUpdated } from '@/lib/xp-events';
import { CodeEditor } from './CodeEditor';

const DIFF_TONE: Record<string, string> = {
  EASY: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  MEDIUM: 'bg-amber-50 text-amber-700 ring-amber-200',
  HARD: 'bg-rose-50 text-rose-700 ring-rose-200',
};

const VERDICT_LABEL: Record<string, string> = {
  ACCEPTED: 'Accepted',
  WRONG_ANSWER: 'Wrong Answer',
  RUNTIME_ERROR: 'Runtime Error',
  COMPILE_ERROR: 'Compile Error',
  TLE: 'Time Limit Exceeded',
  ERROR: 'Execution Error',
  NO_TESTS: 'No test cases',
};

export function CodingWorkspace({ slug }: { slug: string }) {
  const router = useRouter();
  // Coding problems are opened from the dashboard or a company hub — there is no
  // standalone /coding index. "Back" returns to wherever the user came from,
  // falling back to the dashboard (never a dead /coding route).
  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/dashboard');
  };
  const [problem, setProblem] = useState<CodingProblem | null>(null);
  const [missing, setMissing] = useState(false);
  const [languages, setLanguages] = useState<CodingLanguage[]>([]);
  const [lang, setLang] = useState<string>('python');
  const [codeByLang, setCodeByLang] = useState<Record<string, string>>({});
  const [running, setRunning] = useState<'run' | 'submit' | null>(null);
  const [result, setResult] = useState<CodingResult | null>(null);
  const [paywall, setPaywall] = useState<AdaptivePaywall | null>(null);
  const [reward, setReward] = useState<GamificationSummary | null>(null);
  const [solved, setSolved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getCodingProblem(slug), getCodingLanguages()])
      .then(([p, l]) => {
        if (cancelled) return;
        setProblem(p);
        setSolved(p.solved);
        setCodeByLang(p.starterCode ?? {});
        // The problem tells us which languages it offers (SQL-only for SQL
        // problems, else Core-5). Fall back to the global list, then a hardcoded
        // set, only if an older backend doesn't send per-problem languages.
        const supported =
          p.languages && p.languages.length
            ? p.languages
            : l.languages.length
              ? l.languages
              : FALLBACK_LANGS;
        setLanguages(supported);
        // Prefer a language that ships starter code; else first offered.
        const starterLangs = Object.keys(p.starterCode ?? {});
        const initial =
          starterLangs.find((s) => supported.some((x) => x.name === s)) ??
          supported[0]?.name ??
          'python';
        setLang(initial);
      })
      .catch(() => {
        if (!cancelled) setMissing(true);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const monacoLang = useMemo(
    () => languages.find((l) => l.name === lang)?.monaco ?? lang,
    [languages, lang],
  );
  const code = codeByLang[lang] ?? '';

  if (missing) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-10 text-center shadow-sm">
        <CircleSlash className="mx-auto mb-3 size-8 text-slate-400" />
        <p className="text-sm font-semibold text-navy">Problem not found</p>
        <button type="button" onClick={goBack} className="mt-3 inline-block text-sm font-bold text-orange">
          ← Back
        </button>
      </div>
    );
  }
  if (!problem) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-slate-500">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  const run = async (mode: 'run' | 'submit') => {
    setRunning(mode);
    setResult(null);
    setPaywall(null);
    try {
      const r =
        mode === 'run'
          ? await runCodingSample(slug, lang, code)
          : await submitCoding(slug, lang, code);
      setResult(r);
      if (mode === 'submit' && r.verdict === 'ACCEPTED') {
        setSolved(true);
        if (r.gamification) {
          setReward(r.gamification);
          notifyXpUpdated();
        }
      }
    } catch (err) {
      // Free coding limit hit → show a Buy card instead of an error.
      if (err instanceof ApiRequestError && err.code === 'PAYWALL') {
        const d = (err.details ?? {}) as { scope?: string; scopeRef?: string | null; freeLimit?: number };
        setPaywall({
          scope: (d.scope as AdaptivePaywall['scope']) ?? 'TOPIC',
          scopeRef: d.scopeRef ?? null,
          freeUsed: d.freeLimit ?? 5,
          freeLimit: d.freeLimit ?? 5,
        });
      } else {
        setResult({
          ok: false,
          error: 'Could not reach the code runner. Please try again.',
          verdict: 'ERROR',
          passed: 0,
          total: 0,
          compileOutput: null,
          cases: [],
        });
      }
    } finally {
      setRunning(null);
    }
  };

  const reset = () =>
    setCodeByLang((prev) => ({ ...prev, [lang]: problem.starterCode?.[lang] ?? '' }));

  return (
    <div className="relative">
      {reward ? <RewardOverlay summary={reward} onClose={() => setReward(null)} passed /> : null}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-navy"
        >
          <ChevronLeft className="size-4" /> Back
        </button>
        <span
          className={cn(
            'rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset',
            DIFF_TONE[problem.difficulty] ?? DIFF_TONE.EASY,
          )}
        >
          {problem.difficulty}
        </span>
        <span className="rounded-full bg-orange/10 px-2.5 py-0.5 text-[11px] font-bold text-orange">
          +{problem.xpReward} XP
        </span>
        {solved ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
            <CheckCircle2 className="size-3.5" /> Solved
          </span>
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* ── Statement ───────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-indigo-300/20 blur-2xl"
          />
          <h1 className="relative text-[19px] font-extrabold leading-tight tracking-tight text-navy sm:text-[22px]">
            {problem.title}
          </h1>
          {problem.tags.length ? (
            <div className="relative mt-2 flex flex-wrap gap-1.5">
              {problem.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : null}

          <div className="relative mt-4 whitespace-pre-wrap text-[14.5px] leading-relaxed text-slate-700">
            {problem.statement}
          </div>

          {problem.inputFormat ? (
            <Block label="Input">{problem.inputFormat}</Block>
          ) : null}
          {problem.outputFormat ? (
            <Block label="Output">{problem.outputFormat}</Block>
          ) : null}
          {problem.constraints ? (
            <Block label="Constraints">{problem.constraints}</Block>
          ) : null}

          {problem.sampleCases.length ? (
            <div className="relative mt-5 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Examples
              </p>
              {problem.sampleCases.map((c, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-2">
                  <Sample label="Input" text={c.input} />
                  <Sample label="Output" text={c.expectedOutput} />
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {/* ── Editor + controls + results ─────────────────────────── */}
        <section className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-[#0b1220] shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-white/5 px-3 py-2">
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm font-semibold text-slate-100 outline-none focus:border-orange/60"
              >
                {languages.map((l) => (
                  <option key={l.name} value={l.name} className="text-slate-900">
                    {l.label}
                  </option>
                ))}
              </select>
              <button
                onClick={reset}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-100"
              >
                <RotateCcw className="size-3.5" /> Reset
              </button>
            </div>
            <div className="h-[52vh] min-h-[340px]">
              <CodeEditor
                language={monacoLang}
                value={code}
                onChange={(v) => setCodeByLang((prev) => ({ ...prev, [lang]: v }))}
              />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-white/5 px-3 py-2.5">
              <button
                onClick={() => run('run')}
                disabled={running !== null || code.trim().length === 0}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-1.5 text-sm font-bold text-slate-100 hover:bg-white/5 disabled:opacity-50"
              >
                {running === 'run' ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Play className="size-4" />
                )}
                Run sample
              </button>
              <button
                onClick={() => run('submit')}
                disabled={running !== null || code.trim().length === 0}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-[#f37021] to-[#e85c0a] px-5 py-1.5 text-sm font-bold text-white shadow-sm hover:brightness-105 disabled:opacity-50"
              >
                {running === 'submit' ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Submit
              </button>
            </div>
          </div>

          {paywall ? (
            <div className="mt-4">
              <PaywallCard
                paywall={paywall}
                onUnlocked={() => {
                  setPaywall(null);
                  void run('submit');
                }}
              />
            </div>
          ) : result ? (
            <ResultPanel result={result} />
          ) : null}
        </section>
      </div>
    </div>
  );
}

function ResultPanel({ result }: { result: CodingResult }) {
  const accepted = result.verdict === 'ACCEPTED';
  const label = VERDICT_LABEL[result.verdict] ?? result.verdict;
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              'grid size-9 place-items-center rounded-xl text-white',
              accepted ? 'bg-emerald-500' : 'bg-rose-500',
            )}
          >
            {accepted ? <Check className="size-5" /> : <XCircle className="size-5" />}
          </span>
          <div>
            <p
              className={cn(
                'text-sm font-extrabold',
                accepted ? 'text-emerald-700' : 'text-rose-700',
              )}
            >
              {label}
            </p>
            {result.total > 0 ? (
              <p className="text-xs text-slate-600">
                {result.passed} / {result.total} test cases passed
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {result.error ? (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          {result.error}
        </p>
      ) : null}

      {result.compileOutput ? (
        <pre className="mt-3 max-h-44 overflow-auto rounded-lg bg-[#0b1220] p-3 text-xs leading-relaxed text-rose-300">
          {result.compileOutput}
        </pre>
      ) : null}

      {result.cases.length ? (
        <div className="mt-4 space-y-2.5">
          {result.cases.map((c) => (
            <div
              key={c.index}
              className={cn(
                'rounded-xl border p-3 text-sm',
                c.passed ? 'border-emerald-200 bg-emerald-50/60' : 'border-rose-200 bg-rose-50/60',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[12px] font-bold text-slate-600">
                  {c.passed ? (
                    <Check className="size-3.5 text-emerald-600" />
                  ) : (
                    <XCircle className="size-3.5 text-rose-600" />
                  )}
                  {c.hidden ? `Hidden case ${c.index}` : `Case ${c.index}`}
                  <span className="font-medium text-slate-500">· {c.status}</span>
                </span>
                {c.timeSec != null ? (
                  <span className="text-[11px] font-medium text-slate-500">
                    {(c.timeSec * 1000).toFixed(0)} ms
                  </span>
                ) : null}
              </div>
              {!c.hidden ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <IoCell label="Input" text={c.input} emptyLabel="(no input)" />
                  <IoCell label="Expected" text={c.expectedOutput} />
                  <IoCell
                    label="Got"
                    text={c.actualOutput}
                    tone={c.passed ? undefined : 'bad'}
                    emptyLabel={c.stderr ? '(error - see below)' : '(no output)'}
                  />
                </div>
              ) : null}
              {!c.hidden && c.stderr ? (
                <div className="mt-2">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-rose-400">
                    Runtime error / stderr
                  </p>
                  <pre className="max-h-28 overflow-auto rounded-md bg-[#0b1220] p-2 text-[11px] text-rose-300">
                    {c.stderr}
                  </pre>
                </div>
              ) : null}
              {!c.hidden && !c.passed && !c.stderr && (c.actualOutput == null || c.actualOutput.trim() === '') ? (
                <p className="mt-2 text-[11px] font-medium text-amber-700">
                  Your program produced no output - make sure you print the answer to stdout.
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </motion.section>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative mt-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-slate-600">
        {children}
      </p>
    </div>
  );
}

function Sample({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <pre className="overflow-auto whitespace-pre-wrap break-words font-mono text-[12.5px] text-slate-700">
        {text}
      </pre>
    </div>
  );
}

function IoCell({
  label,
  text,
  tone,
  emptyLabel = '-',
}: {
  label: string;
  text: string | null;
  tone?: 'bad';
  emptyLabel?: string;
}) {
  const isEmpty = text == null || text.trim() === '';
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <pre
        className={cn(
          'min-h-[2rem] overflow-auto whitespace-pre-wrap break-words rounded-md border px-2 py-1.5 font-mono text-[12px]',
          isEmpty
            ? 'border-slate-200 bg-slate-50 italic text-slate-500'
            : tone === 'bad'
              ? 'border-rose-200 bg-white text-rose-700'
              : 'border-slate-200 bg-white text-slate-700',
        )}
      >
        {isEmpty ? emptyLabel : text}
      </pre>
    </div>
  );
}

const FALLBACK_LANGS: CodingLanguage[] = [
  { name: 'python', label: 'Python 3', monaco: 'python' },
  { name: 'javascript', label: 'JavaScript (Node)', monaco: 'javascript' },
  { name: 'cpp', label: 'C++', monaco: 'cpp' },
  { name: 'java', label: 'Java', monaco: 'java' },
];
