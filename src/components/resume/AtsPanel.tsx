'use client';

import { useMemo, useState } from 'react';
import type { ResumeData } from './types';
import { computeAtsScore, type AtsBreakdown } from './ats';
import { CheckCircle2, Gauge, Lightbulb, X } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-400">
            <Gauge className="size-4" /> ATS Score
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="size-5" /></button>
        </div>

        <div className="space-y-6 p-5">
          {/* Overall */}
          <div className="flex items-center gap-5 rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
            <div className="relative grid size-24 place-items-center">
              <svg viewBox="0 0 36 36" className="size-24 -rotate-90">
                <circle cx="18" cy="18" r="16" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="16" fill="none" strokeWidth="3" strokeLinecap="round"
                  stroke={result.overall >= 75 ? '#16a34a' : result.overall >= 50 ? '#d97706' : '#ef4444'}
                  strokeDasharray={`${(result.overall / 100) * 100.5} 100.5`}
                />
              </svg>
              <span className={cn('absolute text-2xl font-black', scoreColor(result.overall))}>{result.overall}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-navy">
                {result.overall >= 75 ? 'Strong' : result.overall >= 50 ? 'Getting there' : 'Needs work'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Heuristic ATS readiness{jd.trim().length >= 15 ? ', tailored to the job below' : ''}. Add a job description for keyword matching.
              </p>
            </div>
          </div>

          {/* Breakdown */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Breakdown</p>
            <div className="space-y-2.5">
              {dims.map((k) => (
                <div key={k}>
                  <div className="mb-0.5 flex justify-between text-xs">
                    <span className="text-slate-600">{DIM_LABELS[k]}</span>
                    <span className={cn('font-semibold', scoreColor(result.breakdown[k]))}>{result.breakdown[k]}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100">
                    <div className={cn('h-1.5 rounded-full', barColor(result.breakdown[k]))} style={{ width: `${result.breakdown[k]}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Job description */}
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Match a job (optional)</p>
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

          {/* Suggestions */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
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
      </div>
    </div>
  );
}
