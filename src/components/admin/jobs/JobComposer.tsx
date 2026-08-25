'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, ChevronLeft, ChevronRight, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createJob, updateJob, type JobPostingDto } from '@/lib/api/jobs';
import { uploadJobDescription } from '@/lib/api/media';
import { CompensationKind, EmploymentType, JobKind, JobStatus, WorkMode } from '@/shared/enums';
import type { JobPostingPatch } from '@/shared/dto/jobs.dto';
import { describeError } from '@/lib/api/errors';
import { cn } from '@/lib/utils';
import { TargetPicker } from './TargetPicker';
import { QuestionPicker } from './QuestionPicker';
import { EMPLOYMENT_LABEL, JOB_KIND_LABEL, WORK_MODE_LABEL } from '@/lib/jobs/format';
import { JOB_STATUS_LABEL } from './JobStatusPill';

const input =
  'mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30';
const area =
  'mt-1 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30';
const label = 'text-[10px] font-semibold uppercase tracking-widest text-slate-400';

const STEPS = [
  { key: 'basics', title: 'Basics', hint: 'Title, company, where and how' },
  { key: 'role', title: 'The role', hint: 'Description, skills, process, JD' },
  { key: 'eligibility', title: 'Eligibility', hint: 'Who can apply' },
  { key: 'audience', title: 'Audience', hint: 'Who sees it' },
  { key: 'questions', title: 'Questions', hint: 'What applicants are asked' },
  { key: 'publish', title: 'Publish', hint: 'Status and go live' },
] as const;

function Field({ children }: { children: React.ReactNode }) {
  return <label className="block">{children}</label>;
}

/**
 * The posting composer.
 *
 * The job row is created as an UNPUBLISHED draft the moment step 1 is valid, and every
 * later step is a PATCH. That is what makes the wizard safe to close: an admin who
 * fills in four steps and loses the tab keeps the work, and the audience and question
 * pickers can write immediately rather than holding state hostage until a final save.
 *
 * It also means "Publish" on the last step flips one boolean instead of submitting a
 * six-step form that can half-fail.
 */
export function JobComposer({ existing }: { existing?: JobPostingDto }) {
  const router = useRouter();
  const [job, setJob] = useState<JobPostingDto | null>(existing ?? null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [form, setForm] = useState({
    title: existing?.title ?? '',
    companyName: existing?.companyName ?? '',
    jobKind: existing?.jobKind ?? JobKind.JOB,
    location: existing?.location ?? '',
    workMode: existing?.workMode ?? '',
    employmentType: existing?.employmentType ?? '',
    experience: existing?.experience ?? '',
    openings: existing?.openings?.toString() ?? '',
    applicationDeadline: existing?.applicationDeadline?.slice(0, 10) ?? '',
    excerpt: existing?.excerpt ?? '',
    description: existing?.description ?? '',
    aboutCompany: existing?.aboutCompany ?? '',
    skills: (existing?.skills ?? []).join(', '),
    hiringStages: (existing?.hiringStages ?? []).join('\n'),
    jdFileUrl: existing?.jdFileUrl ?? '',
    jdFileName: existing?.jdFileName ?? '',
    companyLogoUrl: existing?.companyLogoUrl ?? '',
    applyUrl: existing?.applyUrl ?? '',
    compensationKind: existing?.compensationKind ?? CompensationKind.UNDISCLOSED,
    salaryMin: existing?.salaryMin?.toString() ?? '',
    salaryMax: existing?.salaryMax?.toString() ?? '',
    stipendAmount: existing?.stipendAmount?.toString() ?? '',
    education: existing?.education ?? '',
    departments: (existing?.departments ?? []).join(', '),
    ugRequirement: existing?.ugRequirement ?? '',
    pgRequirement: existing?.pgRequirement ?? '',
    otherRequirements: existing?.otherRequirements ?? '',
    passoutYears: (existing?.passoutYears ?? []).join(', '),
    status: existing?.status ?? JobStatus.ACTIVE,
  });

  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };

  const basicsValid = form.title.trim().length >= 3 && form.companyName.trim().length >= 1;

  const payload = useCallback((): JobPostingPatch => {
    const list = (s: string) => s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
    const num = (s: string) => (s.trim() === '' ? null : Number(s));
    return {
      title: form.title.trim(),
      companyName: form.companyName.trim(),
      jobKind: form.jobKind as JobKind,
      location: form.location.trim() || null,
      workMode: (form.workMode || null) as WorkMode | null,
      employmentType: (form.employmentType || null) as EmploymentType | null,
      experience: form.experience.trim() || null,
      openings: num(form.openings),
      applicationDeadline: form.applicationDeadline || null,
      excerpt: form.excerpt.trim() || null,
      description: form.description,
      aboutCompany: form.aboutCompany.trim() || null,
      skills: list(form.skills),
      hiringStages: list(form.hiringStages),
      jdFileUrl: form.jdFileUrl || null,
      jdFileName: form.jdFileName || null,
      companyLogoUrl: form.companyLogoUrl.trim() || null,
      applyUrl: form.applyUrl.trim() || null,
      compensationKind: form.compensationKind as CompensationKind,
      salaryMin: num(form.salaryMin),
      salaryMax: num(form.salaryMax),
      stipendAmount: num(form.stipendAmount),
      education: form.education.trim() || null,
      departments: list(form.departments),
      ugRequirement: form.ugRequirement.trim() || null,
      pgRequirement: form.pgRequirement.trim() || null,
      otherRequirements: form.otherRequirements.trim() || null,
      passoutYears: list(form.passoutYears),
      status: form.status as JobStatus,
    };
  }, [form]);

  /** Persist whatever has been typed. Creates the draft on first call. */
  const persist = useCallback(async (): Promise<JobPostingDto | null> => {
    if (!basicsValid) return null;
    setSaving(true);
    try {
      const saved = job
        ? await updateJob(job.id, payload())
        : await createJob({ ...payload(), title: form.title.trim(), companyName: form.companyName.trim() });
      setJob(saved);
      setDirty(false);
      return saved;
    } catch (err) {
      toast.error(describeError(err, 'Could not save the posting.'));
      return null;
    } finally {
      setSaving(false);
    }
  }, [basicsValid, job, payload, form.title, form.companyName]);

  // Losing four steps of typing to a closed tab is the failure this wizard most needs
  // to avoid, so leaving with unsaved edits is challenged.
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const next = async () => {
    const saved = await persist();
    if (!saved && step === 0) return; // cannot move on without a row to attach to
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const uploadJd = async (file: File) => {
    setSaving(true);
    try {
      const { url, name } = await uploadJobDescription(file);
      setForm((f) => ({ ...f, jdFileUrl: url, jdFileName: name }));
      setDirty(true);
      toast.success('JD attached');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not upload that file.');
    } finally {
      setSaving(false);
    }
  };

  const canPublish = basicsValid && !!job;
  const current = STEPS[step]!;

  return (
    <div className="space-y-6">
      {/* Step rail */}
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          const reachable = i === 0 || !!job;
          return (
            <li key={s.key}>
              <button
                type="button"
                disabled={!reachable}
                onClick={() => reachable && setStep(i)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors',
                  active
                    ? 'bg-navy text-white'
                    : done
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-500 disabled:opacity-60',
                )}
              >
                <span
                  className={cn(
                    'grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold',
                    active ? 'bg-white/20' : done ? 'bg-emerald-100' : 'bg-white',
                  )}
                >
                  {done ? <Check className="size-3" /> : i + 1}
                </span>
                <span className="text-xs font-semibold">{s.title}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className={label}>Step {step + 1} of {STEPS.length}</p>
        <h2 className="mt-1 text-lg font-bold text-navy">{current.title}</h2>
        <p className="mt-0.5 text-sm text-slate-500">{current.hint}</p>

        <div className="mt-5 space-y-4">
          {step === 0 ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <span className={label}>Job title *</span>
                  <input value={form.title} onChange={(e) => set('title', e.target.value)} className={input} placeholder="Software Engineer" />
                </Field>
                <Field>
                  <span className={label}>Company *</span>
                  <input value={form.companyName} onChange={(e) => set('companyName', e.target.value)} className={input} placeholder="Google" />
                </Field>
                <Field>
                  <span className={label}>Kind</span>
                  <select value={form.jobKind} onChange={(e) => set('jobKind', e.target.value)} className={input}>
                    {Object.values(JobKind).map((k) => <option key={k} value={k}>{JOB_KIND_LABEL[k]}</option>)}
                  </select>
                </Field>
                <Field>
                  <span className={label}>Employment type</span>
                  <select value={form.employmentType} onChange={(e) => set('employmentType', e.target.value)} className={input}>
                    <option value="">Not specified</option>
                    {Object.values(EmploymentType).map((t) => <option key={t} value={t}>{EMPLOYMENT_LABEL[t]}</option>)}
                  </select>
                </Field>
                <Field>
                  <span className={label}>Location</span>
                  <input value={form.location} onChange={(e) => set('location', e.target.value)} className={input} placeholder="Pune" />
                </Field>
                <Field>
                  <span className={label}>Work mode</span>
                  <select value={form.workMode} onChange={(e) => set('workMode', e.target.value)} className={input}>
                    <option value="">Not specified</option>
                    {Object.values(WorkMode).map((m) => <option key={m} value={m}>{WORK_MODE_LABEL[m]}</option>)}
                  </select>
                </Field>
                <Field>
                  <span className={label}>Experience</span>
                  <input value={form.experience} onChange={(e) => set('experience', e.target.value)} className={input} placeholder="0-2 years" />
                </Field>
                <Field>
                  <span className={label}>Openings</span>
                  <input type="number" min={1} value={form.openings} onChange={(e) => set('openings', e.target.value)} className={input} />
                </Field>
                <Field>
                  <span className={label}>Apply by</span>
                  <input type="date" value={form.applicationDeadline} onChange={(e) => set('applicationDeadline', e.target.value)} className={input} />
                </Field>
                <Field>
                  <span className={label}>Passout years</span>
                  <input value={form.passoutYears} onChange={(e) => set('passoutYears', e.target.value)} className={input} placeholder="2025, 2026" />
                </Field>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className={label}>Compensation</p>
                <div className="mt-2 grid gap-4 sm:grid-cols-3">
                  <Field>
                    <span className={label}>Type</span>
                    <select value={form.compensationKind} onChange={(e) => set('compensationKind', e.target.value)} className={input}>
                      <option value={CompensationKind.UNDISCLOSED}>Not disclosed</option>
                      <option value={CompensationKind.SALARY}>Salary</option>
                      <option value={CompensationKind.STIPEND}>Stipend</option>
                      <option value={CompensationKind.UNPAID}>Unpaid</option>
                    </select>
                  </Field>
                  {form.compensationKind === CompensationKind.SALARY ? (
                    <>
                      <Field>
                        <span className={label}>Min (₹ per year)</span>
                        <input type="number" min={0} value={form.salaryMin} onChange={(e) => set('salaryMin', e.target.value)} className={input} placeholder="800000" />
                      </Field>
                      <Field>
                        <span className={label}>Max (₹ per year)</span>
                        <input type="number" min={0} value={form.salaryMax} onChange={(e) => set('salaryMax', e.target.value)} className={input} placeholder="1200000" />
                      </Field>
                    </>
                  ) : form.compensationKind === CompensationKind.STIPEND ? (
                    <Field>
                      <span className={label}>Stipend (₹ per month)</span>
                      <input type="number" min={0} value={form.stipendAmount} onChange={(e) => set('stipendAmount', e.target.value)} className={input} placeholder="20000" />
                    </Field>
                  ) : null}
                </div>
              </div>

              <Field>
                <span className={label}>External apply link - leave empty to collect applications here</span>
                <input value={form.applyUrl} onChange={(e) => set('applyUrl', e.target.value)} className={input} placeholder="https://careers.company.com/…" />
              </Field>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <Field>
                <span className={label}>One-line summary (shown on the card and in link previews)</span>
                <input value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} maxLength={300} className={input} />
              </Field>
              <Field>
                <span className={label}>About the role</span>
                <textarea rows={8} value={form.description} onChange={(e) => set('description', e.target.value)} className={area} />
              </Field>
              <Field>
                <span className={label}>Key skills - comma separated</span>
                <input value={form.skills} onChange={(e) => set('skills', e.target.value)} className={input} placeholder="Java, SQL, DSA, Communication" />
              </Field>
              <Field>
                <span className={label}>Hiring process - one stage per line</span>
                <textarea rows={5} value={form.hiringStages} onChange={(e) => set('hiringStages', e.target.value)} className={area} placeholder={'Aptitude Test\nTechnical Interview\nHR Interview'} />
              </Field>
              <Field>
                <span className={label}>About the company</span>
                <textarea rows={4} value={form.aboutCompany} onChange={(e) => set('aboutCompany', e.target.value)} className={area} />
              </Field>
              <div>
                <p className={label}>Job description PDF</p>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-navy shadow-sm hover:bg-slate-50">
                    <Upload className="size-4 text-slate-400" />
                    {form.jdFileName || 'Upload a PDF'}
                    <input
                      type="file"
                      accept="application/pdf"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void uploadJd(f);
                      }}
                    />
                  </label>
                  {form.jdFileUrl ? (
                    <button type="button" onClick={() => { set('jdFileUrl', ''); set('jdFileName', ''); }} className="text-xs font-semibold text-slate-500 hover:text-red-600">
                      Remove
                    </button>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Shown alongside the typed description, not instead of it - a PDF is not readable by
                  search engines and awkward on a phone.
                </p>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <span className={label}>Education</span>
                <input value={form.education} onChange={(e) => set('education', e.target.value)} className={input} placeholder="B.E. / B.Tech" />
              </Field>
              <Field>
                <span className={label}>Departments - comma separated</span>
                <input value={form.departments} onChange={(e) => set('departments', e.target.value)} className={input} placeholder="CSE, IT, ECE" />
              </Field>
              <Field>
                <span className={label}>UG requirement</span>
                <input value={form.ugRequirement} onChange={(e) => set('ugRequirement', e.target.value)} className={input} placeholder="60% or above, no active backlogs" />
              </Field>
              <Field>
                <span className={label}>PG requirement</span>
                <input value={form.pgRequirement} onChange={(e) => set('pgRequirement', e.target.value)} className={input} />
              </Field>
              <div className="sm:col-span-2">
                <Field>
                  <span className={label}>Anything else</span>
                  <textarea rows={4} value={form.otherRequirements} onChange={(e) => set('otherRequirements', e.target.value)} className={area} />
                </Field>
              </div>
            </div>
          ) : null}

          {step === 3 ? job ? <TargetPicker jobId={job.id} /> : null : null}
          {step === 4 ? job ? <QuestionPicker jobId={job.id} /> : null : null}

          {step === 5 ? (
            <div className="space-y-4">
              <Field>
                <span className={label}>Status</span>
                <select value={form.status} onChange={(e) => set('status', e.target.value)} className={input}>
                  {Object.values(JobStatus).map((s) => <option key={s} value={s}>{JOB_STATUS_LABEL[s]}</option>)}
                </select>
                <span className="mt-1 block text-xs text-slate-500">
                  On hold hides a published posting completely, including from its own link. Closed and
                  Completed keep it readable so shared links do not dead-end.
                </span>
              </Field>

              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-bold text-navy">{job?.isPublished ? 'Published' : 'Not published yet'}</p>
                <p className="mt-1 leading-relaxed">
                  {job?.isPublished
                    ? 'Students can see this now, subject to the audience you set.'
                    : 'Nobody can see this yet. Publishing puts it in front of the audience from step 4.'}
                </p>
                {job?.isPublished ? (
                  <p className="mt-2 font-mono text-xs text-slate-500">/jobs/{job.slug}</p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={!canPublish || saving}
                  onClick={async () => {
                    const saved = await persist();
                    if (!saved) return;
                    try {
                      const out = await updateJob(saved.id, { isPublished: !saved.isPublished });
                      setJob(out);
                      toast.success(out.isPublished ? 'Published' : 'Unpublished');
                    } catch (err) {
                      toast.error(describeError(err, 'Could not change the publish state.'));
                    }
                  }}
                >
                  {job?.isPublished ? 'Unpublish' : 'Publish now'}
                </Button>
                <Button variant="outline" onClick={() => router.push('/admin/jobs')}>
                  Back to all postings
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            <ChevronLeft className="size-4" /> Back
          </Button>

          <div className="flex items-center gap-3">
            {saving ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <Loader2 className="size-3.5 animate-spin" /> Saving…
              </span>
            ) : job ? (
              <span className="text-xs text-slate-400">Draft saved</span>
            ) : null}
            {step < STEPS.length - 1 ? (
              <Button onClick={next} disabled={saving || (step === 0 && !basicsValid)}>
                Save and continue <ChevronRight className="size-4" />
              </Button>
            ) : null}
          </div>
        </div>

        {step === 0 && !basicsValid ? (
          <p className="mt-3 text-xs text-slate-500">
            A title and company are needed before the rest can be saved.
          </p>
        ) : null}
      </section>
    </div>
  );
}
