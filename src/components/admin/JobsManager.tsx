'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy, Link2, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createJob, deleteJob, listAdminJobs, updateJob, type JobPostingDto } from '@/lib/api/jobs';
import { describeError } from '@/lib/api/errors';
import { JobStatus, WorkMode } from '@/shared/enums';
import { cn } from '@/lib/utils';

/**
 * Job authoring. Create, publish, share, close.
 *
 * The SLUG is surfaced prominently and made copyable because it is the point of the
 * feature: each posting has its own URL for email and WhatsApp campaigns. It is also
 * why editing a title never rewrites it - links already sent must keep working, so the
 * URL only changes when an admin deliberately changes it.
 */

const EMPTY = {
  title: '',
  companyName: '',
  slug: '',
  excerpt: '',
  location: '',
  workMode: '' as '' | WorkMode,
  employmentType: '',
  experience: '',
  salary: '',
  description: '',
  hiringProcess: '',
  skills: '',
  passoutYears: '',
  openings: '',
  applyUrl: '',
  applicationDeadline: '',
};

const csv = (s: string): string[] => s.split(',').map((x) => x.trim()).filter(Boolean);

export function JobsManager() {
  const [jobs, setJobs] = useState<JobPostingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    listAdminJobs()
      .then(setJobs)
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => load(), [load]);

  const payload = () => ({
    title: form.title.trim(),
    companyName: form.companyName.trim(),
    ...(form.slug.trim() ? { slug: form.slug.trim() } : {}),
    excerpt: form.excerpt.trim() || null,
    location: form.location.trim() || null,
    workMode: form.workMode || null,
    employmentType: form.employmentType.trim() || null,
    experience: form.experience.trim() || null,
    salary: form.salary.trim() || null,
    description: form.description,
    hiringProcess: form.hiringProcess.trim() || null,
    skills: csv(form.skills),
    passoutYears: csv(form.passoutYears),
    openings: form.openings ? Number(form.openings) : null,
    applyUrl: form.applyUrl.trim() || null,
    applicationDeadline: form.applicationDeadline ? new Date(form.applicationDeadline).toISOString() : null,
  });

  const save = async () => {
    if (!form.title.trim() || !form.companyName.trim()) {
      toast.error('A job needs a title and a company.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) await updateJob(editingId, payload());
      else await createJob(payload());
      toast.success(editingId ? 'Job updated' : 'Job created as a draft');
      setForm(EMPTY);
      setEditingId(null);
      load();
    } catch (err) {
      toast.error(describeError(err, 'Could not save the job.'));
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (job: JobPostingDto, status: JobStatus) => {
    try {
      await updateJob(job.id, { status } as never);
      toast.success(status === JobStatus.PUBLISHED ? 'Published to the public board' : `Marked ${status.toLowerCase()}`);
      load();
    } catch (err) {
      toast.error(describeError(err, 'Could not change the status.'));
    }
  };

  const edit = (j: JobPostingDto) => {
    setEditingId(j.id);
    setForm({
      title: j.title,
      companyName: j.companyName,
      slug: j.slug,
      excerpt: j.excerpt ?? '',
      location: j.location ?? '',
      workMode: (j.workMode ?? '') as '' | WorkMode,
      employmentType: j.employmentType ?? '',
      experience: j.experience ?? '',
      salary: j.salary ?? '',
      description: j.description,
      hiringProcess: j.hiringProcess ?? '',
      skills: j.skills.join(', '),
      passoutYears: j.passoutYears.join(', '),
      openings: j.openings ? String(j.openings) : '',
      applyUrl: j.applyUrl ?? '',
      applicationDeadline: j.applicationDeadline ? j.applicationDeadline.slice(0, 10) : '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const copyLink = async (slug: string) => {
    const url = `${window.location.origin}/jobs/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(slug);
      toast.success('Job link copied');
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error('Could not copy - select the link and copy manually.');
    }
  };

  const field = (key: keyof typeof EMPTY, label: string, placeholder = '', type = 'text') => (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</span>
      <input
        type={type}
        value={form[key] as string}
        placeholder={placeholder}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
      />
    </label>
  );

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-navy">{editingId ? 'Edit job' : 'Post a job'}</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {field('title', 'Title', 'Software Engineer')}
          {field('companyName', 'Company', 'Google')}
          {field('location', 'Location', 'Bengaluru')}
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Work mode</span>
            <select
              value={form.workMode}
              onChange={(e) => setForm((f) => ({ ...f, workMode: e.target.value as '' | WorkMode }))}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
            >
              <option value="">Not specified</option>
              {Object.values(WorkMode).map((w) => (
                <option key={w} value={w}>{w.charAt(0) + w.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </label>
          {field('employmentType', 'Employment type', 'Full-time')}
          {field('experience', 'Experience', '0-2 years')}
          {field('salary', 'Compensation', '8-12 LPA')}
          {field('openings', 'Openings', '5', 'number')}
          {field('applicationDeadline', 'Apply by', '', 'date')}
          {field('skills', 'Skills (comma separated)', 'Java, SQL, DSA')}
          {field('passoutYears', 'Passout years (comma separated)', '2026, 2027')}
          {field('applyUrl', 'External apply link (optional)', 'https://careers.example.com/…')}
        </div>

        <label className="mt-4 block">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Preview line — what WhatsApp, Google and LinkedIn show
          </span>
          <input
            value={form.excerpt}
            maxLength={300}
            placeholder="One sentence. Leave blank and we derive one from the role and company."
            onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
            className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
          />
        </label>

        {editingId ? (
          <label className="mt-4 block">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              URL — changing this breaks links already shared
            </span>
            <input
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
            />
          </label>
        ) : null}

        {(['description', 'hiringProcess'] as const).map((k) => (
          <label key={k} className="mt-4 block">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {k === 'description' ? 'About the role' : 'Hiring process'}
            </span>
            <textarea
              rows={k === 'description' ? 6 : 3}
              value={form[k]}
              onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
            />
          </label>
        ))}

        <div className="mt-5 flex items-center gap-3">
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {editingId ? 'Save changes' : 'Create draft'}
          </Button>
          {editingId ? (
            <Button type="button" variant="outline" onClick={() => { setEditingId(null); setForm(EMPTY); }}>
              Cancel
            </Button>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-navy">Postings</h2>
        {loading ? (
          <div className="grid place-items-center py-10"><Loader2 className="size-6 animate-spin text-slate-400" /></div>
        ) : jobs.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">No jobs yet. Post one above.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {jobs.map((j) => (
              <li key={j.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-navy">
                    {j.title} <span className="font-normal text-slate-500">· {j.companyName}</span>
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 font-mono text-xs text-slate-500">
                    <Link2 className="size-3" /> /jobs/{j.slug}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                      j.status === JobStatus.PUBLISHED
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                        : j.status === JobStatus.CLOSED
                          ? 'bg-slate-50 text-slate-600 ring-1 ring-slate-200'
                          : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
                    )}
                  >
                    {j.status.toLowerCase()}
                  </span>
                  {j.status === JobStatus.PUBLISHED ? (
                    <Button size="sm" variant="outline" onClick={() => void copyLink(j.slug)}>
                      {copied === j.slug ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} Link
                    </Button>
                  ) : null}
                  {j.status !== JobStatus.PUBLISHED ? (
                    <Button size="sm" onClick={() => void setStatus(j, JobStatus.PUBLISHED)}>Publish</Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => void setStatus(j, JobStatus.CLOSED)}>Close</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => edit(j)}>Edit</Button>
                  <button
                    type="button"
                    aria-label={`Delete ${j.title}`}
                    onClick={async () => {
                      if (!window.confirm(`Delete "${j.title}"? Its URL stays reserved so old links cannot be re-pointed.`)) return;
                      try { await deleteJob(j.id); toast.success('Job removed'); load(); }
                      catch (err) { toast.error(describeError(err, 'Could not delete the job.')); }
                    }}
                    className="text-slate-400 transition-colors hover:text-red-600"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
