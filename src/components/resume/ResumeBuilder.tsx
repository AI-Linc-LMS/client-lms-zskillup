'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ResumeData, TemplateKey } from './types';
import { emptyResume, fullName, isTemplateKey, normalizeResume } from './types';
import { SAMPLE_RESUME } from './sample-data';
import { TEMPLATES } from './templates';
import { ResumeForm } from './ResumeForm';
import { ResumePreview } from './ResumePreview';
import { AtsPanel } from './AtsPanel';
import { SectionTailorButton } from './SectionTailorButton';
import { resumeToPdfBlob, downloadBlob } from './pdf';
import {
  createResume,
  deleteResume,
  getResume,
  listResumes,
  updateResume,
} from '@/lib/api/resumes';
import type { ResumeSummaryDto } from '@/shared/dto/resume.dto';
import { describeError } from '@/lib/api/errors';
import { Download, FileText, FolderOpen, Gauge, Loader2, RotateCcw, Save, Sparkles, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const DRAFT_KEY = 'zskillup_resume_draft';
const TEMPLATE_KEY = 'zskillup_resume_template';

export function ResumeBuilder() {
  const [data, setData] = useState<ResumeData>(emptyResume);
  const [template, setTemplate] = useState<TemplateKey>('modern');
  const [title, setTitle] = useState('My Resume');
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState<{ msg: string; kind: 'info' | 'error' } | null>(null);
  const [showResumes, setShowResumes] = useState(false);
  const [showAts, setShowAts] = useState(false);
  const [resumes, setResumes] = useState<ResumeSummaryDto[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setData(normalizeResume(JSON.parse(raw)));
      const t = localStorage.getItem(TEMPLATE_KEY);
      if (isTemplateKey(t)) setTemplate(t);
    } catch {
      /* ignore corrupt draft */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
      } catch {
        /* non-fatal */
      }
    }
  }, [data, hydrated]);

  useEffect(() => {
    if (hydrated) localStorage.setItem(TEMPLATE_KEY, template);
  }, [template, hydrated]);

  const flash = (msg: string, kind: 'info' | 'error' = 'info') => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3000);
  };

  const refreshList = useCallback(async () => {
    setListLoading(true);
    try {
      setResumes(await listResumes());
    } catch {
      /* surfaced when the panel is opened */
    } finally {
      setListLoading(false);
    }
  }, []);

  const openResumes = () => {
    setShowResumes(true);
    refreshList();
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
      flash('PDF export failed. Please retry.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const save = async (asNew = false) => {
    setSaving(true);
    try {
      if (currentId && !asNew) {
        await updateResume(currentId, { title, template, data });
        flash('Saved.');
      } else {
        const created = await createResume({ title, template, data });
        setCurrentId(created.id);
        flash('Saved to My Resumes.');
      }
      refreshList();
    } catch (err) {
      flash(describeError(err, 'Save failed.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const load = async (id: string) => {
    try {
      const r = await getResume(id);
      setData(normalizeResume(r.data));
      setTemplate(isTemplateKey(r.template) ? r.template : 'modern');
      setTitle(r.title);
      setCurrentId(r.id);
      setShowResumes(false);
      flash(`Loaded "${r.title}".`);
    } catch (err) {
      flash(describeError(err, 'Could not load that resume.'), 'error');
    }
  };

  const remove = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await deleteResume(id);
      if (currentId === id) setCurrentId(null);
      refreshList();
      flash('Deleted.');
    } catch (err) {
      flash(describeError(err, 'Delete failed.'), 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Row 1: title + save/load/download */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="min-w-[180px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-navy focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
          placeholder="Resume name"
        />
        <div className="flex items-center gap-2">
          <button onClick={openResumes} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            <FolderOpen className="size-4" /> My Resumes
          </button>
          <button onClick={() => save(false)} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-navy hover:bg-slate-50 disabled:opacity-50">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} {currentId ? 'Save' : 'Save'}
          </button>
          {currentId && (
            <button onClick={() => save(true)} disabled={saving} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
              Save as new
            </button>
          )}
          <button onClick={download} disabled={downloading} className="inline-flex items-center gap-1.5 rounded-lg bg-orange px-4 py-2 text-sm font-semibold text-white hover:bg-orange/90 disabled:opacity-50">
            {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} PDF
          </button>
        </div>
      </div>

      {/* Row 2: templates + sample/clear */}
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
          <button onClick={() => setShowAts(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            <Gauge className="size-4" /> ATS Score
          </button>
          <button onClick={() => { setData(SAMPLE_RESUME); flash('Sample loaded.'); }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            <Sparkles className="size-4" /> Sample
          </button>
          <button onClick={() => { if (window.confirm('Clear the whole resume?')) { setData(emptyResume()); setCurrentId(null); flash('Cleared.'); } }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            <RotateCcw className="size-4" /> Clear
          </button>
        </div>
      </div>

      {toast && (
        <div className={cn('flex items-center gap-2 rounded-lg px-3 py-2 text-sm', toast.kind === 'error' ? 'border border-red-200 bg-red-50 text-red-700' : 'border border-navy/15 bg-navy/5 text-navy')}>
          <FileText className="size-4" /> {toast.msg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div className="lg:max-h-[calc(100vh-13rem)] lg:overflow-y-auto lg:pr-1">
          <ResumeForm
            data={data}
            onChange={setData}
            sectionAction={(section) => (
              <SectionTailorButton section={section} data={data} onChange={setData} />
            )}
          />
        </div>
        <div className="lg:sticky lg:top-4 lg:self-start">
          <ResumePreview ref={pageRef} data={data} templateKey={template} />
        </div>
      </div>

      {showAts && <AtsPanel data={data} onClose={() => setShowAts(false)} />}

      {/* My Resumes drawer */}
      {showResumes && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowResumes(false)} aria-hidden />
          <div className="relative flex h-full w-full max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">My Resumes</h2>
              <button onClick={() => setShowResumes(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="size-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {listLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="size-6 animate-spin text-slate-400" /></div>
              ) : resumes.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">No saved resumes yet. Click Save to store one.</p>
              ) : (
                <ul className="space-y-2">
                  {resumes.map((r) => (
                    <li key={r.id} className={cn('flex items-center justify-between gap-2 rounded-lg border p-3', currentId === r.id ? 'border-orange bg-orange/5' : 'border-slate-200')}>
                      <button onClick={() => load(r.id)} className="min-w-0 flex-1 text-left">
                        <p className="truncate text-sm font-semibold text-navy">{r.title}</p>
                        <p className="text-xs text-slate-400">{TEMPLATES.find((t) => t.key === r.template)?.name ?? r.template} · {new Date(r.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </button>
                      <button onClick={() => remove(r.id, r.title)} className="rounded-lg border border-red-200 p-1.5 text-red-500 hover:bg-red-50"><Trash2 className="size-4" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
