'use client';

import { useEffect, useRef, useState } from 'react';
import type { ResumeData, TemplateKey } from './types';
import { emptyResume, fullName } from './types';
import { SAMPLE_RESUME } from './sample-data';
import { TEMPLATES } from './templates';
import { ResumeForm } from './ResumeForm';
import { ResumePreview } from './ResumePreview';
import { resumeToPdfBlob, downloadBlob } from './pdf';
import { Download, FileText, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const DRAFT_KEY = 'zskillup_resume_draft';
const TEMPLATE_KEY = 'zskillup_resume_template';

export function ResumeBuilder() {
  const [data, setData] = useState<ResumeData>(emptyResume);
  const [template, setTemplate] = useState<TemplateKey>('modern');
  const [downloading, setDownloading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  // Restore draft on mount (client-only).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setData(JSON.parse(raw) as ResumeData);
      const t = localStorage.getItem(TEMPLATE_KEY) as TemplateKey | null;
      if (t) setTemplate(t);
    } catch {
      /* ignore corrupt draft */
    }
    setHydrated(true);
  }, []);

  // Persist draft as the user edits.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    } catch {
      /* quota / private mode — non-fatal */
    }
  }, [data, hydrated]);

  useEffect(() => {
    if (hydrated) localStorage.setItem(TEMPLATE_KEY, template);
  }, [template, hydrated]);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  };

  const download = async () => {
    if (!pageRef.current) return;
    setDownloading(true);
    flash('Generating PDF…');
    try {
      const blob = await resumeToPdfBlob(pageRef.current);
      const name = fullName(data.basicInfo).replace(/\s+/g, '_') || 'resume';
      downloadBlob(blob, `${name}_Resume.pdf`);
      flash('Downloaded.');
    } catch {
      flash('PDF export failed. Please retry.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          {TEMPLATES.map((t) => (
            <button
              key={t.key}
              onClick={() => setTemplate(t.key)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                template === t.key ? 'bg-navy text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50',
              )}
            >
              {t.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setData(SAMPLE_RESUME); flash('Sample loaded.'); }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            <Sparkles className="size-4" /> Sample
          </button>
          <button onClick={() => { if (window.confirm('Clear the whole resume?')) { setData(emptyResume()); flash('Cleared.'); } }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            <RotateCcw className="size-4" /> Clear
          </button>
          <button onClick={download} disabled={downloading} className="inline-flex items-center gap-1.5 rounded-lg bg-orange px-4 py-2 text-sm font-semibold text-white hover:bg-orange/90 disabled:opacity-50">
            {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Download PDF
          </button>
        </div>
      </div>

      {toast && (
        <div className="flex items-center gap-2 rounded-lg border border-navy/15 bg-navy/5 px-3 py-2 text-sm text-navy">
          <FileText className="size-4" /> {toast}
        </div>
      )}

      {/* Editor + preview */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div className="lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto lg:pr-1">
          <ResumeForm data={data} onChange={setData} />
        </div>
        <div className="lg:sticky lg:top-4 lg:self-start">
          <ResumePreview ref={pageRef} data={data} templateKey={template} />
        </div>
      </div>
    </div>
  );
}
