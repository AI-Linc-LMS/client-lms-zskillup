'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { ResumeData } from './types';
import { computeAtsScore, type AtsBreakdown } from './ats';
import { aiStatus, atsAnalyze } from '@/lib/api/resume-ai';
import type { AtsAnalyzeResult } from '@/shared/dto/resume-ai.dto';
import { describeError } from '@/lib/api/errors';
import { CheckCircle2, Gauge, Lightbulb, Loader2, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const DIM_LABELS: Record<keyof AtsBreakdown, string> = {
  format: 'Structure',
  completeness: 'Contact & summary',
  contentDepth: 'Content depth',
  keywordMatch: 'Keyword match',
  experience: 'Experience impact',
  education: 'Education & certs',
};

function scoreColor(n: number): string {
  if (n >= 75) return 'text-green-600';
  if (n >= 50) return 'text-amber-600';
  return 'text-red-500';
}
function barColor(n: number): string {
  if (n >= 75) return 'bg-green-500';
  if (n >= 50) return 'bg-amber-500';
  return 'bg-red-400';
}

export function AtsPanel({ data, onClose }: { data: ResumeData; onClose: () => void }) {
  const [jd, setJd] = useState('');
  const result = useMemo(() => computeAtsScore(data, jd), [data, jd]);
  const dims = Object.keys(result.breakdown) as (keyof AtsBreakdown)[];

  const [aiOk, setAiOk] = useState(false);
  const [ai, setAi] = useState<AtsAnalyzeResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  /** The single headline score. The AI review reads the actual content (relevance,
   *  impact, role fit) so it supersedes the structural heuristic once it has run —
   *  otherwise the panel showed two contradictory "ATS scores" side by side. */
  const headline = ai?.overallScore ?? result.overall;

  useEffect(() => {
    let alive = true;
    aiStatus().then((ok) => alive && setAiOk(ok));
    return () => {
      alive = false;
    };
  }, []);

  const runAi = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      setAi(await atsAnalyze(data, jd.trim().length >= 15 ? jd.trim() : undefined));
    } catch (err) {
      setAiError(describeError(err, 'AI analysis failed. Please retry.'));
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} transition={{ type: 'tween', duration: 0.25 }} className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-500">
            <Gauge className="size-4" /> ATS Score
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X className="size-5" /></button>
        </div>

        <div className="space-y-6 p-5">
          {/* Overall - ONE authoritative number. The AI review judges content,
              relevance and impact, so it supersedes the local heuristic once it
              has run; showing both as competing headline scores was the source of
              the "heuristic says 71, AI says 35" contradiction. */}
          <div className="flex items-center gap-5 rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
            <div className="relative grid size-24 place-items-center">
              <svg viewBox="0 0 36 36" className="size-24 -rotate-90">
                <circle cx="18" cy="18" r="16" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="16" fill="none" strokeWidth="3" strokeLinecap="round"
                  stroke={headline >= 75 ? '#16a34a' : headline >= 50 ? '#d97706' : '#ef4444'}
                  strokeDasharray={`${(headline / 100) * 100.5} 100.5`}
                />
              </svg>
              <span className={cn('absolute text-2xl font-black', scoreColor(headline))}>{headline}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-navy">
                {headline >= 75 ? 'Strong' : headline >= 50 ? 'Getting there' : 'Needs work'}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {ai
                  ? 'AI review of your content, relevance and impact.'
                  : `Quick local check of structure and completeness${jd.trim().length >= 15 ? ', tailored to the job below' : ''}. Run the AI analysis for a content review.`}
              </p>
            </div>
          </div>

          {/* Breakdown */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">Breakdown</p>
            <div className="space-y-2.5">
              {dims.map((k) => {
                const v = result.breakdown[k];
                // `null` = not scored (keyword match with no job description). It
                // used to default to 100 and render a full green bar, which alone
                // inflated the overall score.
                if (v === null) {
                  return (
                    <div key={k}>
                      <div className="mb-0.5 flex justify-between text-xs">
                        <span className="text-slate-600">{DIM_LABELS[k]}</span>
                        <span className="font-semibold text-slate-500">Not scored</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100" />
                      <p className="mt-0.5 text-[10px] text-slate-500">Paste a job description below to score this.</p>
                    </div>
                  );
                }
                return (
                  <div key={k}>
                    <div className="mb-0.5 flex justify-between text-xs">
                      <span className="text-slate-600">{DIM_LABELS[k]}</span>
                      <span className={cn('font-semibold', scoreColor(v))}>{v}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100">
                      <div className={cn('h-1.5 rounded-full', barColor(v))} style={{ width: `${v}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Job description */}
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500">Match a job (optional)</p>
            <textarea
              rows={4}
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste a job description to score keyword match…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
            />
            {jd.trim().length >= 15 && (
              <div className="mt-2 space-y-1.5 text-xs">
                {result.matchedKeywords.length > 0 && (
                  <p className="text-slate-600"><span className="font-semibold text-green-600">Matched:</span> {result.matchedKeywords.slice(0, 12).join(', ')}</p>
                )}
                {result.missingKeywords.length > 0 && (
                  <p className="text-slate-600"><span className="font-semibold text-red-500">Missing:</span> {result.missingKeywords.join(', ')}</p>
                )}
              </div>
            )}
          </div>

          {/* AI analysis */}
          {aiOk && (
            <div className="rounded-xl border border-[#6d3bf5]/20 bg-[#6d3bf5]/5 p-4">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#6d3bf5]">
                  <Sparkles className="size-3.5" /> AI analysis
                </p>
                <button onClick={runAi} disabled={aiLoading} className="inline-flex items-center gap-1.5 rounded-lg bg-[#6d3bf5] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#5b2fd6] disabled:opacity-50">
                  {aiLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />} {ai ? 'Re-analyze' : 'Analyze with AI'}
                </button>
              </div>
              {aiError && <p className="mt-2 text-xs text-red-600">{aiError}</p>}
              {ai && (
                <div className="mt-3 space-y-2 text-sm">
                  <p><span className={cn('text-2xl font-black', scoreColor(ai.overallScore))}>{ai.overallScore}</span> <span className="text-xs text-slate-600">/ 100 (AI)</span></p>
                  <p className="text-slate-700">{ai.summary}</p>
                  {ai.strengths.length > 0 && (
                    <div><p className="text-[11px] font-semibold text-green-700">Strengths</p><ul className="list-disc pl-4 text-xs text-slate-700">{ai.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
                  )}
                  {ai.improvements.length > 0 && (
                    <div><p className="text-[11px] font-semibold text-amber-700">Improvements</p><ul className="list-disc pl-4 text-xs text-slate-700">{ai.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
                  )}
                  {ai.missingKeywords.length > 0 && (
                    <p className="text-xs text-slate-600"><span className="font-semibold text-red-500">Missing keywords:</span> {ai.missingKeywords.join(', ')}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Suggestions */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              <Lightbulb className="size-3.5" /> Quick fixes
            </p>
            <ul className="space-y-1.5">
              {result.suggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-orange" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
