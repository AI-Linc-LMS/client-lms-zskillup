import Link from 'next/link';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CalendarClock,
  FileText,
  GraduationCap,
  IndianRupee,
  ListChecks,
  MapPin,
  Users,
} from 'lucide-react';
import { safeHttpUrl } from '@/lib/utils';
import type { JobPostingDto } from '@/shared/dto/jobs.dto';
import { JobStatus } from '@/shared/enums';
import { ApplyButton } from './ApplyButton';
import {
  compensationLabel,
  deadlineLabel,
  EMPLOYMENT_LABEL,
  JOB_KIND_LABEL,
  WORK_MODE_LABEL,
} from '@/lib/jobs/format';

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-navy">
        <Icon className="size-4 shrink-0 text-slate-400" /> {value}
      </p>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof MapPin;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 text-lg font-bold text-navy">
        <Icon className="size-4.5 text-slate-400" aria-hidden="true" /> {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * One role, in full.
 *
 * Shared between the server-rendered page and the client fallback for targeted roles,
 * so both render identically - the difference between them is only WHO could fetch the
 * data, never what it looks like once fetched.
 */
export function JobDetail({ job, others }: { job: JobPostingDto; others: JobPostingDto[] }) {
  const closes = deadlineLabel(job.applicationDeadline);
  const closed = job.status !== JobStatus.ACTIVE || closes?.tone === 'closed';
  const applyHref = safeHttpUrl(job.applyUrl);
  const logoSrc = safeHttpUrl(job.companyLogoUrl);
  const jd = safeHttpUrl(job.jdFileUrl);
  const pay = compensationLabel(job);

  const eligibility = [
    job.education ? { label: 'Education', value: job.education } : null,
    job.departments.length ? { label: 'Departments', value: job.departments.join(', ') } : null,
    job.ugRequirement ? { label: 'UG', value: job.ugRequirement } : null,
    job.pgRequirement ? { label: 'PG', value: job.pgRequirement } : null,
    job.passoutYears.length ? { label: 'Passout years', value: job.passoutYears.join(', ') } : null,
    job.otherRequirements ? { label: 'Other', value: job.otherRequirements } : null,
  ].filter((x): x is { label: string; value: string } => x !== null);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-navy"
      >
        <ArrowLeft className="size-4" /> All jobs
      </Link>

      <header className="mt-5 flex items-start gap-4">
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoSrc}
            alt=""
            className="size-14 shrink-0 rounded-2xl object-contain ring-1 ring-slate-100"
          />
        ) : (
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
            <Briefcase className="size-6" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold tracking-tight text-navy">{job.title}</h1>
          <p className="mt-1 text-base text-slate-600">{job.companyName}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
              {JOB_KIND_LABEL[job.jobKind]}
            </span>
            {job.employmentType ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                {EMPLOYMENT_LABEL[job.employmentType]}
              </span>
            ) : null}
            {closes && closes.tone !== 'normal' ? (
              <span
                className={
                  closes.tone === 'closed'
                    ? 'rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200'
                    : 'rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200'
                }
              >
                {closes.text}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      {closed ? (
        <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">
          This role is no longer accepting applications. It stays here so shared links keep
          working - browse the board for live openings.
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {job.location ? (
          <Fact
            icon={MapPin}
            label="Location"
            value={`${job.location}${job.workMode ? ` · ${WORK_MODE_LABEL[job.workMode]}` : ''}`}
          />
        ) : null}
        {job.experience ? <Fact icon={Briefcase} label="Experience" value={job.experience} /> : null}
        {pay ? <Fact icon={IndianRupee} label="Compensation" value={pay} /> : null}
        {job.openings ? <Fact icon={Users} label="Openings" value={String(job.openings)} /> : null}
        {closes ? <Fact icon={CalendarClock} label="Apply by" value={closes.text} /> : null}
      </div>

      {job.description ? (
        <Section title="About the role" icon={FileText}>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
            {job.description}
          </p>
        </Section>
      ) : null}

      {jd ? (
        <a
          href={jd}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy shadow-sm transition-colors hover:bg-slate-50"
        >
          <FileText className="size-4 text-slate-400" />
          {job.jdFileName || 'Download the full job description (PDF)'}
        </a>
      ) : null}

      {job.skills.length > 0 ? (
        <Section title="Key skills" icon={ListChecks}>
          <div className="flex flex-wrap gap-2">
            {job.skills.map((s) => (
              <span
                key={s}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
              >
                {s}
              </span>
            ))}
          </div>
        </Section>
      ) : null}

      {eligibility.length > 0 ? (
        <Section title="Who can apply" icon={GraduationCap}>
          <dl className="grid gap-3 sm:grid-cols-2">
            {eligibility.map((e) => (
              <div key={e.label} className="rounded-xl border border-slate-200 bg-white p-4">
                <dt className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  {e.label}
                </dt>
                <dd className="mt-1 text-sm text-slate-700">{e.value}</dd>
              </div>
            ))}
          </dl>
        </Section>
      ) : null}

      {job.hiringStages.length > 0 ? (
        <Section title="Hiring process" icon={ListChecks}>
          <ol className="space-y-2">
            {job.hiringStages.map((stage, i) => (
              <li key={`${stage}-${i}`} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-navy text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <span className="text-sm leading-relaxed text-slate-700">{stage}</span>
              </li>
            ))}
          </ol>
        </Section>
      ) : job.hiringProcess ? (
        <Section title="Hiring process" icon={ListChecks}>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
            {job.hiringProcess}
          </p>
        </Section>
      ) : null}

      {job.aboutCompany ? (
        <Section title={`About ${job.companyName}`} icon={Building2}>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
            {job.aboutCompany}
          </p>
        </Section>
      ) : null}

      {/* Two kinds of role, and they must not look alike. When the employer collects
          applications themselves we send the student out and record nothing - claiming
          to have received an application we never see would be a lie. */}
      {closed ? null : applyHref ? (
        <div className="mt-9">
          <a
            href={applyHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-navy/90"
          >
            Apply on the company site
          </a>
          <p className="mt-2 text-xs text-slate-500">
            {job.companyName} takes applications directly, so this one is not tracked in your
            ZSkillup applications list.
          </p>
        </div>
      ) : (
        <ApplyButton slug={job.slug} jobId={job.id} jobTitle={job.title} />
      )}

      {others.length > 0 ? (
        <section className="mt-12 border-t border-slate-200 pt-8">
          <h2 className="text-lg font-bold text-navy">Other openings</h2>
          <ul className="mt-3 space-y-2">
            {others.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/jobs/${o.slug}`}
                  className="text-sm font-semibold text-navy hover:underline"
                >
                  {o.title} <span className="font-normal text-slate-500">· {o.companyName}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
