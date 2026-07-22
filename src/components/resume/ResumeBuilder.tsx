'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { ApiRequestError } from '@/lib/api/types';
import type { ResumeData, TemplateKey } from './types';
import { emptyResume, fullName, isTemplateKey, newId, normalizeResume } from './types';
import { SAMPLE_RESUME } from './sample-data';
import { getMe, type ApiMe } from '@/lib/api/me';
import { TEMPLATES } from './templates';
import { computeAtsScore } from './ats';
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
import { Copy, Download, FileText, FolderOpen, Gauge, LayoutTemplate, Loader2, RotateCcw, Save, Sparkles, Trash2, UserRound, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Drafts are keyed PER USER so a saved draft can never leak into a different
// account on the same browser (mirrors CartProvider's per-user cart key). The
// legacy GLOBAL keys are purged on mount so no account inherits a stale draft.
const LEGACY_DRAFT_KEY = 'zskillup_resume_draft';
const LEGACY_TEMPLATE_KEY = 'zskillup_resume_template';
const draftKey = (userId: string) => `zskillup_resume_draft:${userId}`;
const templateKey = (userId: string) => `zskillup_resume_template:${userId}`;

function atsColor(n: number): string {
  if (n >= 75) return 'text-green-600';
  if (n >= 50) return 'text-amber-600';
  return 'text-red-500';
}

const BRANCH_LABEL: Record<string, string> = {
  CSE: 'Computer Science Engineering',
  IT: 'Information Technology',
  ECE: 'Electronics & Communication Engineering',
  EEE: 'Electrical & Electronics Engineering',
  MECH: 'Mechanical Engineering',
  CIVIL: 'Civil Engineering',
  OTHER: '',
};

/** True when the editor is still a blank slate (no identity + no sections), so
 *  it's safe to seed from the profile without clobbering anything the user typed. */
function isResumeEmpty(d: ResumeData): boolean {
  const b = d.basicInfo;
  const noBasics =
    !b.firstName && !b.lastName && !b.email && !b.phone && !b.summary && !b.professionalTitle;
  const noSections =
    d.workExperience.length === 0 &&
    d.education.length === 0 &&
    d.skills.length === 0 &&
    d.projects.length === 0 &&
    d.certifications.length === 0;
  return noBasics && noSections;
}

/** Seed a resume from the student's profile - name, contact, education, skills -
 *  so the builder opens pre-filled instead of blank. Leaves summary/experience/
 *  projects for the student (or the AI tailor) to complete. */
function resumeFromProfile(me: ApiMe): ResumeData {
  const r = emptyResume();
  const p = me.studentProfile;
  const parts = (me.fullName ?? '').trim().split(/\s+/).filter(Boolean);
  r.basicInfo.firstName = parts[0] ?? '';
  r.basicInfo.lastName = parts.slice(1).join(' ');
  r.basicInfo.email = me.email ?? '';
  r.basicInfo.phone = p?.phone ?? '';
  if (p?.rolesInterested?.length) r.basicInfo.professionalTitle = p.rolesInterested[0];
  if (p?.collegeName || p?.course || p?.branch || p?.passoutYear) {
    r.education = [
      {
        id: newId(),
        degree: p?.course || (p?.branch ? BRANCH_LABEL[p.branch] ?? '' : '') || '',
        institution: p?.collegeName ?? '',
        location: '',
        startDate: p?.passoutYear ? `${p.passoutYear - 4}-08` : '',
        endDate: p?.passoutYear ? `${p.passoutYear}-06` : '',
        gpa: '',
        description: '',
      },
    ];
  }
  if (p?.skills?.length) {
    r.skills = p.skills.map((name) => ({ id: newId(), name }));
  }
  return r;
}

export function ResumeBuilder() {
  const [data, setData] = useState<ResumeData>(emptyResume);
  const [template, setTemplate] = useState<TemplateKey>('modern');
  const [title, setTitle] = useState('My Resume');
  const [currentId, setCurrentId] = useState<string | null>(null);
  /** Title of the resume currently open, so we can tell a RENAME from an edit.
   *  Renaming + "Save" used to silently overwrite the original, which is why
   *  users couldn't keep multiple resumes under different names. */
  const [savedTitle, setSavedTitle] = useState('');
  /** Renamed an open resume → they almost certainly want a SEPARATE file, so we
   *  highlight "Save as new" rather than quietly overwriting the original. */
  const renamed = currentId !== null && title.trim() !== savedTitle.trim();
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showResumes, setShowResumes] = useState(false);
  const [showAts, setShowAts] = useState(false);
  const [resumes, setResumes] = useState<ResumeSummaryDto[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  const ats = useMemo(() => computeAtsScore(data, '').overall, [data]);

  useEffect(() => {
    // Purge the legacy GLOBAL draft first so no account ever inherits it (this is
    // the cross-account leak). Then identify the user and read only THAT user's
    // draft - never a global one.
    try {
      localStorage.removeItem(LEGACY_DRAFT_KEY);
      localStorage.removeItem(LEGACY_TEMPLATE_KEY);
    } catch {
      /* private mode / SSR */
    }
    getMe()
      .then((me) => {
        setUserId(me.id);
        let hasDraft = false;
        try {
          const raw = localStorage.getItem(draftKey(me.id));
          if (raw) {
            setData(normalizeResume(JSON.parse(raw)));
            hasDraft = true;
          }
          const t = localStorage.getItem(templateKey(me.id));
          if (isTemplateKey(t)) setTemplate(t);
        } catch {
          /* ignore corrupt draft */
        }
        // No per-user draft → seed the editor from the student's profile so
        // contact + education + skills are prefilled instead of a blank page.
        if (!hasDraft) {
          setData((prev) => (isResumeEmpty(prev) ? resumeFromProfile(me) : prev));
        }
        setHydrated(true);
      })
      .catch(() => {
        // Not a student / offline: no user id, so no draft is read or written
        // (avoids ever adopting another account's data). Editor stays usable.
        setHydrated(true);
      });
  }, []);

  useEffect(() => {
    // Persist only once the owning user is known → drafts stay per-account.
    if (hydrated && userId) {
      try {
        localStorage.setItem(draftKey(userId), JSON.stringify(data));
      } catch {
        /* non-fatal */
      }
    }
  }, [data, hydrated, userId]);

  useEffect(() => {
    if (hydrated && userId) localStorage.setItem(templateKey(userId), template);
  }, [template, hydrated, userId]);

  const router = useRouter();

  const flash = (msg: string, kind: 'info' | 'error' = 'info') => {
    if (kind === 'error') toast.error(msg);
    else toast.success(msg);
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
    // Export IS the resume's value path, so it must count against the free-run
    // meter (parity with Mock Interview, whose "start" always persists a row).
    // Persisting an unsaved resume here routes the export through the metered
    // POST /me/resumes, which the backend blocks with CAREER_PAYWALL after the
    // free run - without this, build-and-download never counted and never locked.
    if (!currentId) {
      try {
        const created = await createResume({ title, template, data });
        setCurrentId(created.id);
        setSavedTitle(title);
        refreshList();
      } catch (err) {
        if (err instanceof ApiRequestError && err.code === 'CAREER_PAYWALL') {
          setDownloading(false);
          toast.error("You've used your free resume", {
            description: 'Upgrade to save and export more resumes.',
            action: { label: 'Upgrade', onClick: () => router.push('/upgrade') },
          });
          return;
        }
        // A transient (non-paywall) save failure shouldn't block the export the
        // user explicitly asked for - fall through and still generate the PDF.
      }
    }
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
        setSavedTitle(title);
        flash(`Updated "${title}".`);
      } else {
        const created = await createResume({ title, template, data });
        setCurrentId(created.id);
        setSavedTitle(title);
        flash(`Saved "${title}" to My Resumes.`);
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
      setSavedTitle(r.title);
      setCurrentId(r.id);
      setShowResumes(false);
      flash(`Loaded "${r.title}".`);
    } catch (err) {
      flash(describeError(err, 'Could not load that resume.'), 'error');
    }
  };

  const fillFromProfile = async () => {
    try {
      const me = await getMe();
      setData(resumeFromProfile(me));
      setCurrentId(null);
      flash('Filled from your profile.');
    } catch {
      flash('Could not load your profile.', 'error');
    }
  };

  const remove = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await deleteResume(id);
      if (currentId === id) { setCurrentId(null); setSavedTitle(''); }
      refreshList();
      flash('Deleted.');
    } catch (err) {
      flash(describeError(err, 'Delete failed.'), 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Row 1: title + primary actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:border-orange focus-within:ring-1 focus-within:ring-orange">
          <FileText className="size-4 shrink-0 text-slate-500" />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-transparent py-2 text-sm font-semibold text-navy focus:outline-none"
            placeholder="Resume name"
          />
          {currentId && <span className="hidden shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700 sm:inline">Saved</span>}
        </div>
        <div className="flex items-center gap-2">
          <button data-tour="resume:ats" onClick={() => setShowAts(true)} className={cn('inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold hover:bg-slate-50', atsColor(ats))}>
            <Gauge className="size-4" /> ATS {ats}
          </button>
          <button onClick={openResumes} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            <FolderOpen className="size-4" /> <span className="hidden sm:inline">My Resumes</span>
          </button>
          {/* "Save" OVERWRITES the open resume, so say so once one is open. */}
          <button
            onClick={() => save(false)}
            disabled={saving}
            title={currentId ? `Overwrite "${savedTitle || title}"` : 'Save to My Resumes'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-navy hover:bg-slate-50 disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {currentId ? 'Update' : 'Save'}
          </button>
          {/* Always reachable (it used to be `hidden sm:inline-flex`, so on mobile
              there was NO way to keep a second resume). Emphasised once the name
              has been changed - that's the moment users expect a separate file. */}
          {currentId && (
            <button
              onClick={() => save(true)}
              disabled={saving}
              title="Save this as a separate resume"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50',
                renamed
                  ? 'border-orange bg-orange/10 text-orange hover:bg-orange/15'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50',
              )}
            >
              <Copy className="size-4" /> Save as new
            </button>
          )}
          <button data-tour="resume:save-export" onClick={download} disabled={downloading} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-orange to-[#f5872f] px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:shadow disabled:opacity-50">
            {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} PDF
          </button>
        </div>
      </div>

      {/* Row 2: template picker + sample/clear */}
      <div data-tour="resume:templates" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            <LayoutTemplate className="size-3.5" /> Template
          </span>
          <div className="flex flex-1 gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]">
            {TEMPLATES.map((t) => {
              const active = template === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTemplate(t.key)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all',
                    active ? 'border-navy bg-navy text-white shadow-sm' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                  )}
                >
                  <span className="size-2.5 rounded-full ring-1 ring-black/10" style={{ background: t.accent }} />
                  {t.name}
                </button>
              );
            })}
          </div>
        </div>
        <div data-tour="resume:starters" className="flex shrink-0 items-center gap-2">
          <button onClick={fillFromProfile} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            <UserRound className="size-4" /> From profile
          </button>
          <button onClick={() => { setData(SAMPLE_RESUME); flash('Sample loaded.'); }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            <Sparkles className="size-4" /> Sample
          </button>
          <button onClick={() => { if (window.confirm('Clear the whole resume?')) { setData(emptyResume()); setCurrentId(null); setSavedTitle(''); flash('Cleared.'); } }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            <RotateCcw className="size-4" /> Clear
          </button>
        </div>
      </div>

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
        <div data-tour="resume:preview" className="lg:sticky lg:top-4 lg:self-start">
          <ResumePreview ref={pageRef} data={data} templateKey={template} />
        </div>
      </div>

      {showAts && <AtsPanel data={data} onClose={() => setShowAts(false)} />}

      {/* My Resumes drawer */}
      <AnimatePresence>
        {showResumes && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowResumes(false)} aria-hidden />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: 0.25 }} className="relative flex h-full w-full max-w-sm flex-col bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-500"><FolderOpen className="size-4" /> My Resumes</h2>
                <button onClick={() => setShowResumes(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X className="size-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {listLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="size-6 animate-spin text-slate-500" /></div>
                ) : resumes.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-12 text-center">
                    <FolderOpen className="size-8 text-slate-400" />
                    <p className="text-sm text-slate-500">No saved resumes yet.<br />Click Save to store one.</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {resumes.map((r) => (
                      <li key={r.id} className={cn('flex items-center justify-between gap-2 rounded-lg border p-3 transition-colors', currentId === r.id ? 'border-orange bg-orange/5' : 'border-slate-200 hover:bg-slate-50')}>
                        <button onClick={() => load(r.id)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                          <span className="size-2.5 shrink-0 rounded-full ring-1 ring-black/10" style={{ background: TEMPLATES.find((t) => t.key === r.template)?.accent ?? '#64748b' }} />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-navy">{r.title}</span>
                            <span className="block text-xs text-slate-500">{TEMPLATES.find((t) => t.key === r.template)?.name ?? r.template} · {new Date(r.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </span>
                        </button>
                        <button onClick={() => remove(r.id, r.title)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-500"><Trash2 className="size-4" /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
