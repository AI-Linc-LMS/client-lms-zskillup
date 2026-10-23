'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, ChevronLeft, ChevronRight, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createJob, updateJob, type JobPostingDto } from '@/lib/api/jobs';
import { uploadCompanyLogo, uploadJobDescription } from '@/lib/api/media';
import {
  CompensationKind,
  CompensationStructure,
  EmploymentType,
  JobKind,
  JobStatus,
  WorkMode,
} from '@/shared/enums';

const DURATION_PRESETS = ['1 Month', '2 Months', '3 Months', '6 Months', '12 Months'];
import type { JobPostingPatch } from '@/shared/dto/jobs.dto';
import { describeError } from '@/lib/api/errors';
import { cn } from '@/lib/utils';
import { TargetPicker } from './TargetPicker';
import { QuestionPicker } from './QuestionPicker';
import { RelatedContentPicker } from './RelatedContentPicker';
import { JobCreativesManager } from './JobCreativesManager';
import { EligibilityRulesEditor } from './EligibilityRulesEditor';
import { PlannedRoundsEditor } from './PlannedRoundsEditor';
import { EMPTY_RULE_SET, type EligibilityRuleSet } from '@/shared/drive-eligibility';
import type { PlannedRound } from '@/shared/drive-rounds';
import {
  DriveApprovalStatus,
  DriveAudienceMode,
  DrivePriority,
  EmployerType,
  IneligibleDisplay,
} from '@/shared/enums';
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
  { key: 'drive', title: 'Drive', hint: 'Employer contact, rounds, governance' },
  { key: 'audience', title: 'Audience', hint: 'Who sees it' },
  { key: 'questions', title: 'Questions', hint: 'What applicants are asked' },
  { key: 'related', title: 'Related content', hint: 'Placement stories & articles' },
  { key: 'creatives', title: 'Creatives', hint: 'Posters on the public page' },
  { key: 'publish', title: 'Publish', hint: 'Status and go live' },
] as const;

function Field({ children }: { children: React.ReactNode }) {
  return <label className="block">{children}</label>;
}

/** UTC ISO from the server → the value a `datetime-local` input wants, in the admin's
 *  LOCAL wall-clock. A bare `.slice(0,16)` of the UTC ISO would show the wrong hour. */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
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
    applicationDeadline: toLocalInput(existing?.applicationDeadline),
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
    internshipDuration: existing?.internshipDuration ?? '',
    stipendRange: existing?.stipendRange ?? '',
    stipendStructure: existing?.stipendStructure ?? '',
    stipendRemarks: existing?.stipendRemarks ?? '',
    hasPpo: existing?.hasPpo ?? false,
    ppoCtc: existing?.ppoCtc ?? '',
    ppoStructure: existing?.ppoStructure ?? '',
    ppoRemarks: existing?.ppoRemarks ?? '',
    education: existing?.education ?? '',
    departments: (existing?.departments ?? []).join(', '),
    ugRequirement: existing?.ugRequirement ?? '',
    pgRequirement: existing?.pgRequirement ?? '',
    otherRequirements: existing?.otherRequirements ?? '',

    /* ── PRD §4 ── */
    driveCode: existing?.driveCode ?? '',
    owningTeam: existing?.owningTeam ?? '',
    campusScope: existing?.campusScope ?? '',
    internalNotes: existing?.internalNotes ?? '',
    tags: (existing?.tags ?? []).join(', '),
    companyWebsite: existing?.companyWebsite ?? '',
    companyIndustry: existing?.companyIndustry ?? '',
    hrContactName: existing?.hrContactName ?? '',
    hrContactDesignation: existing?.hrContactDesignation ?? '',
    hrContactEmail: existing?.hrContactEmail ?? '',
    hrContactPhone: existing?.hrContactPhone ?? '',
    hiringManager: existing?.hiringManager ?? '',
    employerType: existing?.employerType ?? '',
    isConfidential: existing?.isConfidential ?? false,
    departmentFunction: existing?.departmentFunction ?? '',
    responsibilities: existing?.responsibilities ?? '',
    preferredSkills: (existing?.preferredSkills ?? []).join(', '),
    roleCategory: existing?.roleCategory ?? '',
    travelRequirements: existing?.travelRequirements ?? '',
    shiftTiming: existing?.shiftTiming ?? '',
    joiningDate: existing?.joiningDate ?? '',
    probationDetails: existing?.probationDetails ?? '',
    currency: existing?.currency ?? 'INR',
    ctcStructure: existing?.ctcStructure ?? '',
    ctcFixedAmount: existing?.ctcFixedAmount?.toString() ?? '',
    ctcVariableAmount: existing?.ctcVariableAmount?.toString() ?? '',
    benefits: existing?.benefits ?? '',
    bonusDetails: existing?.bonusDetails ?? '',
    applicationOpensAt: toLocalInput(existing?.applicationOpensAt),
    maxApplications: existing?.maxApplications?.toString() ?? '',
    allowLateApplication: existing?.allowLateApplication ?? false,
    allowApplicationEdit: existing?.allowApplicationEdit ?? true,
    resumeRequired: existing?.resumeRequired ?? true,
    applicationInstructions: existing?.applicationInstructions ?? '',
    audienceMode: existing?.audienceMode ?? DriveAudienceMode.ALL_ELIGIBLE,
    ineligibleDisplay: existing?.ineligibleDisplay ?? IneligibleDisplay.SHOW_REASON,
    isHidden: existing?.isHidden ?? false,
    publishAt: toLocalInput(existing?.publishAt),
    unpublishAt: toLocalInput(existing?.unpublishAt),
    minMatchScore: existing?.minMatchScore?.toString() ?? '',
    shortlistCapacity: existing?.shortlistCapacity?.toString() ?? '',
    priority: existing?.priority ?? '',
    venue: existing?.venue ?? '',
    meetingLink: existing?.meetingLink ?? '',
    reportingInstructions: existing?.reportingInstructions ?? '',
    queryContact: existing?.queryContact ?? '',
    internalComments: existing?.internalComments ?? '',
    linkedRequisition: existing?.linkedRequisition ?? '',
    approvalStatus: existing?.approvalStatus ?? DriveApprovalStatus.NOT_REQUIRED,
    jobSource: existing?.jobSource ?? '',
    dataSharingPermitted: existing?.dataSharingPermitted ?? false,
    resumeSharingConsentRequired: existing?.resumeSharingConsentRequired ?? true,
    employerTerms: existing?.employerTerms ?? '',
    cancellationReason: existing?.cancellationReason ?? '',
    passoutYears: (existing?.passoutYears ?? []).join(', '),
    status: existing?.status ?? JobStatus.DRAFT,
    isPrephaszOpportunity: existing?.isPrephaszOpportunity ?? true,
  });

  // Structured, so they live outside the flat string form.
  const [rules, setRules] = useState<EligibilityRuleSet>(
    existing?.eligibilityRules ?? EMPTY_RULE_SET,
  );
  const [rounds, setRounds] = useState<PlannedRound[]>(existing?.plannedRounds ?? []);

  const set = (k: Exclude<keyof typeof form, BoolKey>, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };
  type BoolKey = {
    [K in keyof typeof form]: (typeof form)[K] extends boolean ? K : never;
  }[keyof typeof form];
  const setBool = (k: BoolKey, v: boolean) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };
  // "Custom duration" is active when a non-preset value is set (or the admin picks it).
  const [customDuration, setCustomDuration] = useState(
    !!existing?.internshipDuration && !DURATION_PRESETS.includes(existing.internshipDuration),
  );

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
      applicationDeadline: form.applicationDeadline
        ? new Date(form.applicationDeadline).toISOString()
        : null,
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
      internshipDuration: form.internshipDuration.trim() || null,
      stipendRange: form.stipendRange.trim() || null,
      stipendStructure: (form.stipendStructure || null) as CompensationStructure | null,
      stipendRemarks: form.stipendRemarks.trim() || null,
      hasPpo: form.hasPpo,
      ppoCtc: form.ppoCtc.trim() || null,
      ppoStructure: (form.ppoStructure || null) as CompensationStructure | null,
      ppoRemarks: form.ppoRemarks.trim() || null,
      education: form.education.trim() || null,
      departments: list(form.departments),
      ugRequirement: form.ugRequirement.trim() || null,
      pgRequirement: form.pgRequirement.trim() || null,
      otherRequirements: form.otherRequirements.trim() || null,
      passoutYears: list(form.passoutYears),
      status: form.status as JobStatus,
      isPrephaszOpportunity: form.isPrephaszOpportunity,

      /* ── PRD §4: the placement drive record ───────────────────────────── */
      driveCode: form.driveCode.trim() || null,
      owningTeam: form.owningTeam.trim() || null,
      campusScope: form.campusScope.trim() || null,
      internalNotes: form.internalNotes.trim() || null,
      tags: list(form.tags),

      companyWebsite: form.companyWebsite.trim() || null,
      companyIndustry: form.companyIndustry.trim() || null,
      hrContactName: form.hrContactName.trim() || null,
      hrContactDesignation: form.hrContactDesignation.trim() || null,
      hrContactEmail: form.hrContactEmail.trim() || null,
      hrContactPhone: form.hrContactPhone.trim() || null,
      hiringManager: form.hiringManager.trim() || null,
      employerType: (form.employerType || null) as EmployerType | null,
      isConfidential: form.isConfidential,

      departmentFunction: form.departmentFunction.trim() || null,
      responsibilities: form.responsibilities.trim() || null,
      preferredSkills: list(form.preferredSkills),
      roleCategory: form.roleCategory.trim() || null,
      travelRequirements: form.travelRequirements.trim() || null,
      shiftTiming: form.shiftTiming.trim() || null,
      joiningDate: form.joiningDate || null,
      probationDetails: form.probationDetails.trim() || null,

      currency: form.currency.trim() || 'INR',
      ctcStructure: (form.ctcStructure || null) as CompensationStructure | null,
      ctcFixedAmount: num(form.ctcFixedAmount),
      ctcVariableAmount: num(form.ctcVariableAmount),
      benefits: form.benefits.trim() || null,
      bonusDetails: form.bonusDetails.trim() || null,

      eligibilityRules: rules,

      applicationOpensAt: form.applicationOpensAt
        ? new Date(form.applicationOpensAt).toISOString()
        : null,
      maxApplications: num(form.maxApplications),
      allowLateApplication: form.allowLateApplication,
      allowApplicationEdit: form.allowApplicationEdit,
      resumeRequired: form.resumeRequired,
      applicationInstructions: form.applicationInstructions.trim() || null,

      audienceMode: form.audienceMode as DriveAudienceMode,
      ineligibleDisplay: form.ineligibleDisplay as IneligibleDisplay,
      isHidden: form.isHidden,
      publishAt: form.publishAt ? new Date(form.publishAt).toISOString() : null,
      unpublishAt: form.unpublishAt ? new Date(form.unpublishAt).toISOString() : null,

      minMatchScore: num(form.minMatchScore),
      shortlistCapacity: num(form.shortlistCapacity),

      priority: (form.priority || null) as DrivePriority | null,
      plannedRounds: rounds,
      venue: form.venue.trim() || null,
      meetingLink: form.meetingLink.trim() || null,
      reportingInstructions: form.reportingInstructions.trim() || null,
      queryContact: form.queryContact.trim() || null,
      internalComments: form.internalComments.trim() || null,
      linkedRequisition: form.linkedRequisition.trim() || null,

      approvalStatus: form.approvalStatus as DriveApprovalStatus,
      jobSource: form.jobSource.trim() || null,
      dataSharingPermitted: form.dataSharingPermitted,
      resumeSharingConsentRequired: form.resumeSharingConsentRequired,
      employerTerms: form.employerTerms.trim() || null,
      cancellationReason: form.cancellationReason.trim() || null,
    };
  }, [form, rules, rounds]);

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

  const uploadLogo = async (file: File) => {
    setSaving(true);
    try {
      const url = await uploadCompanyLogo(file);
      setForm((f) => ({ ...f, companyLogoUrl: url }));
      setDirty(true);
      toast.success('Logo uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not upload that image.');
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
          {current.key === 'basics' ? (
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
                  <span className={label}>Company logo</span>
                  <div className="flex items-center gap-2">
                    <input value={form.companyLogoUrl} onChange={(e) => set('companyLogoUrl', e.target.value)} className={input} placeholder="Paste a URL or upload…" />
                    <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-navy transition-colors hover:bg-slate-50">
                      <Upload className="size-3.5" /> Upload
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void uploadLogo(f);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {form.companyLogoUrl.trim() ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={form.companyLogoUrl}
                        alt=""
                        className="size-10 shrink-0 rounded-lg border border-slate-200 object-contain p-1"
                        onError={(e) => {
                          e.currentTarget.style.visibility = 'hidden';
                        }}
                        onLoad={(e) => {
                          e.currentTarget.style.visibility = 'visible';
                        }}
                      />
                    ) : null}
                  </div>
                  <span className="mt-1 block text-xs text-slate-400">Paste a URL or upload an image (PNG, JPG, WebP · max 5MB).</span>
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
                  <input type="datetime-local" value={form.applicationDeadline} onChange={(e) => set('applicationDeadline', e.target.value)} className={input} />
                  <span className="mt-1 block text-xs text-slate-400">Applications stop at this exact date &amp; time.</span>
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

              {form.jobKind === JobKind.INTERNSHIP ? (
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className={label}>Internship details</p>
                  <div className="mt-2 grid gap-4 sm:grid-cols-2">
                    <Field>
                      <span className={label}>Duration</span>
                      <select
                        value={customDuration ? '__custom__' : form.internshipDuration}
                        onChange={(e) => {
                          if (e.target.value === '__custom__') {
                            setCustomDuration(true);
                            set('internshipDuration', '');
                          } else {
                            setCustomDuration(false);
                            set('internshipDuration', e.target.value);
                          }
                        }}
                        className={input}
                      >
                        <option value="">Select…</option>
                        {DURATION_PRESETS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                        <option value="__custom__">Custom…</option>
                      </select>
                    </Field>
                    {customDuration ? (
                      <Field>
                        <span className={label}>Custom duration</span>
                        <input
                          value={form.internshipDuration}
                          onChange={(e) => set('internshipDuration', e.target.value)}
                          className={input}
                          placeholder="e.g. 4 Months"
                        />
                      </Field>
                    ) : (
                      <div />
                    )}

                    <Field>
                      <span className={label}>Stipend</span>
                      <input
                        value={form.stipendRange}
                        onChange={(e) => set('stipendRange', e.target.value)}
                        className={input}
                        placeholder="₹20,000 – ₹25,000 / Month"
                      />
                    </Field>
                    <Field>
                      <span className={label}>Stipend structure</span>
                      <select
                        value={form.stipendStructure}
                        onChange={(e) => set('stipendStructure', e.target.value)}
                        className={input}
                      >
                        <option value="">Not specified</option>
                        <option value={CompensationStructure.FIXED}>Fixed</option>
                        <option value={CompensationStructure.FIXED_PLUS_VARIABLE}>Fixed + Variable</option>
                      </select>
                    </Field>
                    <div className="sm:col-span-2">
                      <Field>
                        <span className={label}>Stipend remarks (optional)</span>
                        <input
                          value={form.stipendRemarks}
                          onChange={(e) => set('stipendRemarks', e.target.value)}
                          className={input}
                          placeholder="e.g. Variable component based on performance"
                        />
                      </Field>
                    </div>

                    <label className="flex items-center gap-2 sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={form.hasPpo}
                        onChange={(e) => setBool('hasPpo', e.target.checked)}
                        className="size-4 rounded border-slate-300 text-orange focus:ring-orange/30"
                      />
                      <span className="text-sm text-slate-700">
                        Full-time opportunity (PPO) after the internship
                      </span>
                    </label>

                    {form.hasPpo ? (
                      <>
                        <Field>
                          <span className={label}>Full-time CTC</span>
                          <input
                            value={form.ppoCtc}
                            onChange={(e) => set('ppoCtc', e.target.value)}
                            className={input}
                            placeholder="₹8 LPA – ₹10 LPA"
                          />
                        </Field>
                        <Field>
                          <span className={label}>CTC structure</span>
                          <select
                            value={form.ppoStructure}
                            onChange={(e) => set('ppoStructure', e.target.value)}
                            className={input}
                          >
                            <option value="">Not specified</option>
                            <option value={CompensationStructure.FIXED}>Fixed</option>
                            <option value={CompensationStructure.FIXED_PLUS_VARIABLE}>Fixed + Variable</option>
                          </select>
                        </Field>
                        <div className="sm:col-span-2">
                          <Field>
                            <span className={label}>Full-time CTC remarks (optional)</span>
                            <input
                              value={form.ppoRemarks}
                              onChange={(e) => set('ppoRemarks', e.target.value)}
                              className={input}
                              placeholder="e.g. Full-time conversion based on internship performance"
                            />
                          </Field>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <Field>
                <span className={label}>External apply link - leave empty to collect applications here</span>
                <input value={form.applyUrl} onChange={(e) => set('applyUrl', e.target.value)} className={input} placeholder="https://careers.company.com/…" />
              </Field>
            </>
          ) : null}

          {current.key === 'role' ? (
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

          {current.key === 'eligibility' ? (
            <div className="space-y-6">
              <section className="space-y-2">
                <p className={label}>Hard criteria</p>
                <p className="text-xs text-slate-500">
                  Checked against each student&rsquo;s record. A student who fails one of these
                  cannot apply; what the drive does about a student we have never asked is set below.
                </p>
                <EligibilityRulesEditor value={rules} onChange={(r) => { setRules(r); setDirty(true); }} />
              </section>

              <section className="space-y-2">
                <p className={label}>In the employer&rsquo;s own words</p>
                <p className="text-xs text-slate-500">
                  Shown to students as written. Not checked by the system &mdash; the criteria above are.
                </p>
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
              </section>
            </div>
          ) : null}

          {current.key === 'drive' ? (
            <div className="space-y-6">
              {/* Conditional by design (PRD §4): a drive has eleven field groups and an
                  ordinary job posting needs none of them, so each block is collapsed
                  behind its own heading rather than dumped on one page. */}
              <section className="space-y-3">
                <p className={label}>Identity</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field>
                    <span className={label}>Drive code</span>
                    <input value={form.driveCode} onChange={(e) => set('driveCode', e.target.value)} className={input} placeholder="ACN-2027-01" />
                    <span className="mt-1 block text-xs text-slate-500">The handle you and the employer quote at each other. Must be unique.</span>
                  </Field>
                  <Field>
                    <span className={label}>Owning team</span>
                    <input value={form.owningTeam} onChange={(e) => set('owningTeam', e.target.value)} className={input} />
                  </Field>
                  <Field>
                    <span className={label}>Campus scope</span>
                    <input value={form.campusScope} onChange={(e) => set('campusScope', e.target.value)} className={input} placeholder="Pune campus" />
                  </Field>
                  <Field>
                    <span className={label}>Tags - comma separated</span>
                    <input value={form.tags} onChange={(e) => set('tags', e.target.value)} className={input} />
                  </Field>
                  <Field>
                    <span className={label}>Linked requisition</span>
                    <input value={form.linkedRequisition} onChange={(e) => set('linkedRequisition', e.target.value)} className={input} />
                  </Field>
                  <Field>
                    <span className={label}>Priority</span>
                    <select value={form.priority} onChange={(e) => set('priority', e.target.value)} className={input}>
                      <option value="">Not set</option>
                      {Object.values(DrivePriority).map((p) => <option key={p} value={p}>{p[0] + p.slice(1).toLowerCase()}</option>)}
                    </select>
                  </Field>
                </div>
              </section>

              <section className="space-y-3">
                <p className={label}>Employer contact</p>
                <p className="text-xs text-slate-500">Staff-only. None of this reaches a student.</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field><span className={label}>Website</span><input value={form.companyWebsite} onChange={(e) => set('companyWebsite', e.target.value)} className={input} placeholder="https://" /></Field>
                  <Field><span className={label}>Industry</span><input value={form.companyIndustry} onChange={(e) => set('companyIndustry', e.target.value)} className={input} /></Field>
                  <Field>
                    <span className={label}>Employer type</span>
                    <select value={form.employerType} onChange={(e) => set('employerType', e.target.value)} className={input}>
                      <option value="">Not set</option>
                      {Object.values(EmployerType).map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                    </select>
                  </Field>
                  <Field><span className={label}>HR contact</span><input value={form.hrContactName} onChange={(e) => set('hrContactName', e.target.value)} className={input} /></Field>
                  <Field><span className={label}>Designation</span><input value={form.hrContactDesignation} onChange={(e) => set('hrContactDesignation', e.target.value)} className={input} /></Field>
                  <Field><span className={label}>Hiring manager</span><input value={form.hiringManager} onChange={(e) => set('hiringManager', e.target.value)} className={input} /></Field>
                  <Field><span className={label}>Contact email</span><input value={form.hrContactEmail} onChange={(e) => set('hrContactEmail', e.target.value)} className={input} /></Field>
                  <Field><span className={label}>Contact phone</span><input value={form.hrContactPhone} onChange={(e) => set('hrContactPhone', e.target.value)} className={input} /></Field>
                  <Field><span className={label}>Source of this job</span><input value={form.jobSource} onChange={(e) => set('jobSource', e.target.value)} className={input} placeholder="Referral, inbound, alumni" /></Field>
                </div>
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.isConfidential} onChange={(e) => setBool('isConfidential', e.target.checked)} className="mt-0.5" />
                  <span>Confidential - keep this employer off public listings and limit who sees candidate data.</span>
                </label>
              </section>

              <section className="space-y-3">
                <p className={label}>Role detail</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field><span className={label}>Department / function</span><input value={form.departmentFunction} onChange={(e) => set('departmentFunction', e.target.value)} className={input} /></Field>
                  <Field><span className={label}>Role category</span><input value={form.roleCategory} onChange={(e) => set('roleCategory', e.target.value)} className={input} /></Field>
                  <Field><span className={label}>Preferred skills - comma separated</span><input value={form.preferredSkills} onChange={(e) => set('preferredSkills', e.target.value)} className={input} /></Field>
                  <Field><span className={label}>Shift / timing</span><input value={form.shiftTiming} onChange={(e) => set('shiftTiming', e.target.value)} className={input} /></Field>
                  <Field><span className={label}>Travel</span><input value={form.travelRequirements} onChange={(e) => set('travelRequirements', e.target.value)} className={input} /></Field>
                  <Field><span className={label}>Joining date</span><input type="date" value={form.joiningDate} onChange={(e) => set('joiningDate', e.target.value)} className={input} /></Field>
                </div>
                <Field><span className={label}>Responsibilities</span><textarea rows={3} value={form.responsibilities} onChange={(e) => set('responsibilities', e.target.value)} className={area} /></Field>
                <Field><span className={label}>Probation / contract</span><textarea rows={2} value={form.probationDetails} onChange={(e) => set('probationDetails', e.target.value)} className={area} /></Field>
              </section>

              <section className="space-y-3">
                <p className={label}>Compensation detail</p>
                <div className="grid gap-4 sm:grid-cols-4">
                  <Field><span className={label}>Currency</span><input value={form.currency} onChange={(e) => set('currency', e.target.value)} className={input} /></Field>
                  <Field>
                    <span className={label}>CTC structure</span>
                    <select value={form.ctcStructure} onChange={(e) => set('ctcStructure', e.target.value)} className={input}>
                      <option value="">Not set</option>
                      {Object.values(CompensationStructure).map((c) => <option key={c} value={c}>{c.replace(/_/g, ' + ').toLowerCase()}</option>)}
                    </select>
                  </Field>
                  <Field><span className={label}>Fixed</span><input type="number" value={form.ctcFixedAmount} onChange={(e) => set('ctcFixedAmount', e.target.value)} className={input} /></Field>
                  <Field><span className={label}>Variable</span><input type="number" value={form.ctcVariableAmount} onChange={(e) => set('ctcVariableAmount', e.target.value)} className={input} /></Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field><span className={label}>Benefits</span><textarea rows={2} value={form.benefits} onChange={(e) => set('benefits', e.target.value)} className={area} /></Field>
                  <Field><span className={label}>Bonus / incentives</span><textarea rows={2} value={form.bonusDetails} onChange={(e) => set('bonusDetails', e.target.value)} className={area} /></Field>
                </div>
              </section>

              <section className="space-y-3">
                <p className={label}>Planned rounds</p>
                <PlannedRoundsEditor value={rounds} onChange={(r) => { setRounds(r); setDirty(true); }} />
              </section>

              <section className="space-y-3">
                <p className={label}>On the day</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field><span className={label}>Venue</span><input value={form.venue} onChange={(e) => set('venue', e.target.value)} className={input} /></Field>
                  <Field><span className={label}>Meeting link</span><input value={form.meetingLink} onChange={(e) => set('meetingLink', e.target.value)} className={input} placeholder="https://" /></Field>
                  <Field><span className={label}>Contact for queries</span><input value={form.queryContact} onChange={(e) => set('queryContact', e.target.value)} className={input} /></Field>
                  <Field><span className={label}>Shortlist capacity</span><input type="number" value={form.shortlistCapacity} onChange={(e) => set('shortlistCapacity', e.target.value)} className={input} /></Field>
                </div>
                <Field><span className={label}>Reporting instructions</span><textarea rows={2} value={form.reportingInstructions} onChange={(e) => set('reportingInstructions', e.target.value)} className={area} /></Field>
              </section>

              <section className="space-y-3">
                <p className={label}>Governance</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <span className={label}>Approval</span>
                    <select value={form.approvalStatus} onChange={(e) => set('approvalStatus', e.target.value)} className={input}>
                      {Object.values(DriveApprovalStatus).map((a) => <option key={a} value={a}>{a.replace(/_/g, ' ').toLowerCase()}</option>)}
                    </select>
                  </Field>
                  <Field><span className={label}>Cancellation reason</span><input value={form.cancellationReason} onChange={(e) => set('cancellationReason', e.target.value)} className={input} /></Field>
                </div>
                <Field><span className={label}>Employer terms</span><textarea rows={2} value={form.employerTerms} onChange={(e) => set('employerTerms', e.target.value)} className={area} /></Field>
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.dataSharingPermitted} onChange={(e) => setBool('dataSharingPermitted', e.target.checked)} className="mt-0.5" />
                  <span>The employer may receive candidate data for this drive.</span>
                </label>
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.resumeSharingConsentRequired} onChange={(e) => setBool('resumeSharingConsentRequired', e.target.checked)} className="mt-0.5" />
                  <span>Ask each student to consent before their resume is shared.</span>
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field><span className={label}>Internal notes</span><textarea rows={2} value={form.internalNotes} onChange={(e) => set('internalNotes', e.target.value)} className={area} /></Field>
                  <Field><span className={label}>Internal comments</span><textarea rows={2} value={form.internalComments} onChange={(e) => set('internalComments', e.target.value)} className={area} /></Field>
                </div>
              </section>
            </div>
          ) : null}

          {current.key === 'audience' ? (
            <div className="space-y-6">
              <section className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <span className={label}>Who may see it</span>
                  <select value={form.audienceMode} onChange={(e) => set('audienceMode', e.target.value)} className={input}>
                    <option value={DriveAudienceMode.ALL_ELIGIBLE}>Everyone it reaches who is eligible</option>
                    <option value={DriveAudienceMode.SELECTED_ONLY}>Only the students picked below</option>
                  </select>
                  <span className="mt-1 block text-xs text-slate-500">
                    A picked audience has no public fallback: leave the list empty and it reaches nobody.
                  </span>
                </Field>
                <Field>
                  <span className={label}>Students who are not eligible</span>
                  <select
                    value={form.ineligibleDisplay}
                    onChange={(e) => set('ineligibleDisplay', e.target.value)}
                    disabled={form.audienceMode === DriveAudienceMode.SELECTED_ONLY}
                    className={input}
                  >
                    <option value={IneligibleDisplay.SHOW_REASON}>See it, and why they cannot apply</option>
                    <option value={IneligibleDisplay.SHOW_DISABLED}>See it, with Apply disabled</option>
                    <option value={IneligibleDisplay.HIDE}>Do not see it at all</option>
                  </select>
                  {form.audienceMode === DriveAudienceMode.SELECTED_ONLY ? (
                    <span className="mt-1 block text-xs text-slate-500">
                      Fixed to hidden - a picked audience has nobody else to show a reason to.
                    </span>
                  ) : null}
                </Field>
                <Field>
                  <span className={label}>Publish at</span>
                  <input type="datetime-local" value={form.publishAt} onChange={(e) => set('publishAt', e.target.value)} className={input} />
                </Field>
                <Field>
                  <span className={label}>Unpublish at</span>
                  <input type="datetime-local" value={form.unpublishAt} onChange={(e) => set('unpublishAt', e.target.value)} className={input} />
                </Field>
                <Field>
                  <span className={label}>Applications open at</span>
                  <input type="datetime-local" value={form.applicationOpensAt} onChange={(e) => set('applicationOpensAt', e.target.value)} className={input} />
                </Field>
                <Field>
                  <span className={label}>Maximum applications</span>
                  <input type="number" value={form.maxApplications} onChange={(e) => set('maxApplications', e.target.value)} className={input} />
                </Field>
              </section>

              <section className="space-y-2">
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.isHidden} onChange={(e) => setBool('isHidden', e.target.checked)} className="mt-0.5" />
                  <span>Hidden - off the board entirely, including from its own link.</span>
                </label>
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.resumeRequired} onChange={(e) => setBool('resumeRequired', e.target.checked)} className="mt-0.5" />
                  <span>A resume is required to apply.</span>
                </label>
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.allowApplicationEdit} onChange={(e) => setBool('allowApplicationEdit', e.target.checked)} className="mt-0.5" />
                  <span>Students may edit or withdraw their application.</span>
                </label>
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.allowLateApplication} onChange={(e) => setBool('allowLateApplication', e.target.checked)} className="mt-0.5" />
                  <span>Accept applications after the deadline.</span>
                </label>
                <Field>
                  <span className={label}>Application instructions</span>
                  <textarea rows={2} value={form.applicationInstructions} onChange={(e) => set('applicationInstructions', e.target.value)} className={area} />
                </Field>
              </section>

              {job ? <TargetPicker jobId={job.id} /> : null}
            </div>
          ) : null}
          {current.key === 'questions' ? (job ? <QuestionPicker jobId={job.id} /> : null) : null}
          {current.key === 'related' ? (
            job ? (
              <RelatedContentPicker
                jobId={job.id}
                initialTestimonialIds={job.testimonialIds ?? []}
                initialBlogIds={job.blogIds ?? []}
                initialPlacementIds={job.placementIds ?? []}
                onSaved={setJob}
              />
            ) : null
          ) : null}

          {/* Creatives live beside related content: both are what the public page shows
              rather than what the drive IS, and both need the drive to exist first. */}
          {current.key === 'creatives' ? (
            job ? (
              <JobCreativesManager jobId={job.id} />
            ) : (
              <p className="text-sm text-slate-500">Save the drive first, then add images.</p>
            )
          ) : null}

          {current.key === 'publish' ? (
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

              <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
                <input
                  type="checkbox"
                  checked={form.isPrephaszOpportunity}
                  onChange={(e) => setBool('isPrephaszOpportunity', e.target.checked)}
                  className="mt-0.5 size-4 rounded border-slate-300 text-orange focus:ring-orange/30"
                />
                <span>
                  <span className="block text-sm font-semibold text-navy">Prephasz Opportunity</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                    On = a curated/partner role, shown under &ldquo;Prephasz Opportunities&rdquo; on the
                    board. Off = an aggregated &ldquo;Other Opportunity&rdquo;. Students can filter by this.
                  </span>
                </span>
              </label>

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
              <Button onClick={next} disabled={saving || (current.key === 'basics' && !basicsValid)}>
                Save and continue <ChevronRight className="size-4" />
              </Button>
            ) : null}
          </div>
        </div>

        {current.key === 'basics' && !basicsValid ? (
          <p className="mt-3 text-xs text-slate-500">
            A title and company are needed before the rest can be saved.
          </p>
        ) : null}
      </section>
    </div>
  );
}
