'use client';

import { useState } from 'react';
import type { ResumeData, Skill } from './types';
import { newId } from './types';
import { tailorSection } from '@/lib/api/resume-ai';
import type { ResumeAiSection, TailorSectionResult } from '@/shared/dto/resume-ai.dto';
import { describeError } from '@/lib/api/errors';
import { Check, Loader2, Sparkles, X } from 'lucide-react';

const LABELS: Record<ResumeAiSection, string> = {
  summary: 'Summary',
  skills: 'Skills',
  experience: 'Experience',
  projects: 'Projects',
};

/** Per-section AI tailoring: paste a JD, generate suggestions, apply them. */
export function SectionTailorButton({
  section,
  data,
  onChange,
}: {
  section: ResumeAiSection;
  data: ResumeData;
  onChange: (d: ResumeData) => void;
}) {
  const [open, setOpen] = useState(false);
  const [jd, setJd] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TailorSectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const generate = async () => {
    if (jd.trim().length < 15) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setApplied(false);
    try {
      setResult(await tailorSection(section, data, jd.trim()));
    } catch (err) {
      setError(describeError(err, 'Tailoring failed. Please retry.'));
    } finally {
      setLoading(false);
    }
  };

  const applySummary = () => {
    if (!result?.summaryAfter) return;
    onChange({ ...data, basicInfo: { ...data.basicInfo, summary: result.summaryAfter } });
    setApplied(true);
  };

  const applySkills = () => {
    if (!result) return;
    const order = result.reorderedSkillNames ?? [];
    const byName = new Map(data.skills.map((s) => [s.name.toLowerCase(), s]));
    const reordered: Skill[] = [];
    for (const name of order) {
      const found = byName.get(name.toLowerCase());
      if (found && !reordered.includes(found)) reordered.push(found);
    }
    for (const s of data.skills) if (!reordered.includes(s)) reordered.push(s);
    for (const sug of result.missingSkillSuggestions ?? []) {
      if (!reordered.some((s) => s.name.toLowerCase() === sug.name.toLowerCase())) {
        reordered.push({ id: newId(), name: sug.name, level: 3, category: '' });
      }
    }
    onChange({ ...data, skills: reordered });
    setApplied(true);
  };

  const applyExperience = () => {
    if (!result?.bulletChanges) return;
    const work = data.workExperience.map((w) => ({ ...w, description: [...w.description] }));
    for (const c of result.bulletChanges) {
      const w = work.find(
        (x) => x.position.toLowerCase() === c.position.toLowerCase() && x.company.toLowerCase() === c.company.toLowerCase(),
      );
      if (w && c.index >= 0 && c.index < w.description.length) w.description[c.index] = c.after;
    }
    onChange({ ...data, workExperience: work });
    setApplied(true);
  };

  const applyProjects = () => {
    if (!result?.projectChanges) return;
    const projects = data.projects.map((p) => ({ ...p }));
    for (const c of result.projectChanges) {
      const p = projects.find((x) => x.name.toLowerCase() === c.name.toLowerCase());
      if (p) p.description = c.afterDescription;
    }
    onChange({ ...data, projects });
    setApplied(true);
  };

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="inline-flex items-center gap-1 rounded-md bg-[#6d3bf5]/10 px-2 py-1 text-[11px] font-semibold text-[#6d3bf5] hover:bg-[#6d3bf5]/15"
        title={`Tailor ${LABELS[section]} to a job with AI`}
      >
        <Sparkles className="size-3" /> AI tailor
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden />
          <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-navy"><Sparkles className="size-4 text-[#6d3bf5]" /> Tailor {LABELS[section]} to a job</h3>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="size-5" /></button>
            </div>
            <div className="space-y-4 overflow-y-auto p-5">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-500">Paste the job description</label>
                <textarea rows={5} value={jd} onChange={(e) => setJd(e.target.value)} maxLength={12000} placeholder="Paste the role's responsibilities and requirements…" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange" />
                <p className="mt-1 text-[11px] text-slate-400">{jd.trim().length < 15 ? 'At least 15 characters.' : `${jd.length} characters`}</p>
              </div>
              <button onClick={generate} disabled={loading || jd.trim().length < 15} className="inline-flex items-center gap-2 rounded-lg bg-[#6d3bf5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5b2fd6] disabled:opacity-50">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Generate
              </button>

              {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

              {result && (
                <div className="space-y-3">
                  {result.rationale && (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">{result.rationale}</p>
                  )}

                  {section === 'summary' && result.summaryAfter && (
                    <div className="grid grid-cols-1 gap-2">
                      <Panel title="Before" text={result.summaryBefore ?? ''} muted />
                      <Panel title="After" text={result.summaryAfter} />
                      <ApplyBtn onClick={applySummary} applied={applied} />
                    </div>
                  )}

                  {section === 'skills' && (
                    <div className="space-y-2">
                      {result.reorderedSkillNames && result.reorderedSkillNames.length > 0 && (
                        <div><p className="text-[11px] font-semibold text-slate-500">Reordered</p><p className="text-sm text-slate-700">{result.reorderedSkillNames.join(' · ')}</p></div>
                      )}
                      {result.missingSkillSuggestions && result.missingSkillSuggestions.length > 0 && (
                        <div>
                          <p className="text-[11px] font-semibold text-slate-500">Suggested additions</p>
                          <ul className="mt-1 space-y-1">
                            {result.missingSkillSuggestions.map((s) => (
                              <li key={s.name} className="text-sm text-slate-700"><span className="font-semibold">{s.name}</span> — <span className="text-slate-500">{s.reason}</span></li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <ApplyBtn onClick={applySkills} applied={applied} label="Reorder + add" />
                    </div>
                  )}

                  {section === 'experience' && result.bulletChanges && (
                    <div className="space-y-2">
                      {result.bulletChanges.map((c, i) => (
                        <div key={i} className="rounded-lg border border-slate-200 p-2">
                          <p className="text-[11px] font-semibold text-slate-500">{c.position} · {c.company}</p>
                          <p className="mt-1 text-xs text-slate-400 line-through">{c.before}</p>
                          <p className="text-sm text-slate-800">{c.after}</p>
                        </div>
                      ))}
                      <ApplyBtn onClick={applyExperience} applied={applied} label="Apply rewrites" />
                    </div>
                  )}

                  {section === 'projects' && result.projectChanges && (
                    <div className="space-y-2">
                      {result.projectChanges.map((c, i) => (
                        <div key={i} className="rounded-lg border border-slate-200 p-2">
                          <p className="text-[11px] font-semibold text-slate-500">{c.name}</p>
                          <p className="mt-1 text-xs text-slate-400 line-through">{c.beforeDescription}</p>
                          <p className="text-sm text-slate-800">{c.afterDescription}</p>
                        </div>
                      ))}
                      <ApplyBtn onClick={applyProjects} applied={applied} label="Apply rewrites" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Panel({ title, text, muted }: { title: string; text: string; muted?: boolean }) {
  return (
    <div className={`rounded-lg border p-2 ${muted ? 'border-slate-200 bg-slate-50' : 'border-green-200 bg-green-50'}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{title}</p>
      <p className={`mt-0.5 whitespace-pre-wrap text-sm ${muted ? 'text-slate-500' : 'text-slate-800'}`}>{text}</p>
    </div>
  );
}

function ApplyBtn({ onClick, applied, label = 'Apply rewrite' }: { onClick: () => void; applied: boolean; label?: string }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700">
      <Check className="size-3.5" /> {applied ? 'Applied — apply again' : label}
    </button>
  );
}
