import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  FileText,
  IndianRupee,
  MapPin,
  Newspaper,
  Quote as QuoteIcon,
  Star,
  TrendingUp,
} from 'lucide-react';
import { safeHttpUrl } from '@/lib/utils';
import type { JobPostingDto } from '@/shared/dto/jobs.dto';
import type { BlogPostDto, PlacementRecordDto, TestimonialDto } from '@/shared/dto/content.dto';
import { CompensationStructure, JobKind, JobStatus } from '@/shared/enums';

const STRUCTURE_LABEL: Record<CompensationStructure, string> = {
  [CompensationStructure.FIXED]: 'Fixed',
  [CompensationStructure.FIXED_PLUS_VARIABLE]: 'Fixed + Variable',
};
import { ApplyButton } from './ApplyButton';
import { AuroraBackground, Marquee, Reveal, RevealX } from '@/components/motion/primitives';
import { StatusPill, type StatusTone } from '@/components/student/StatusPill';
import { Button } from '@/components/ui/button';
import {
  compensationLabel,
  deadlineLabel,
  JOB_KIND_LABEL,
  WORK_MODE_LABEL,
} from '@/lib/jobs/format';

const DEADLINE_TONE: Record<'urgent' | 'soon' | 'normal' | 'closed', StatusTone> = {
  urgent: 'warning',
  soon: 'warning',
  normal: 'info',
  closed: 'neutral',
};

/** §4.4(a) standard surface. */
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{children}</p>
  );
}

type Fact = { icon: typeof MapPin; label: string; value: string };

/** One placement success card — reused in the grid and the horizontal marquee. */
function PlacementCard({ p }: { p: PlacementRecordDto }) {
  const logo = safeHttpUrl(p.companyLogoUrl);
  const avatar = safeHttpUrl(p.avatarUrl);
  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-center gap-3">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt=""
            className="size-12 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
          />
        ) : (
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-bold text-slate-500">
            {p.studentName.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-navy">{p.studentName}</p>
          {p.role || p.batch ? (
            <p className="truncate text-xs text-slate-500">
              {[p.role, p.batch].filter(Boolean).join(' · ')}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <span className="flex min-w-0 items-center gap-2">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt=""
              className="size-6 shrink-0 rounded-md bg-white object-contain ring-1 ring-slate-200"
            />
          ) : (
            <span className="grid size-6 shrink-0 place-items-center rounded-md bg-sky-50 text-sky-600 ring-1 ring-sky-100">
              <Building2 className="size-3.5" />
            </span>
          )}
          <span className="truncate text-xs font-semibold text-slate-600">{p.company}</span>
        </span>
        {p.packageLabel ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
            <TrendingUp className="size-3.5" />
            {p.packageLabel}
          </span>
        ) : null}
      </div>
    </Card>
  );
}

/** A compact blog row for the rail — reused in the vertical "Related reading" marquee. */
function BlogRow({ b }: { b: BlogPostDto }) {
  return (
    <Link
      href={`/blog/${b.slug}`}
      className="flex items-start gap-3 rounded-lg p-1.5 transition-colors hover:bg-slate-50"
    >
      {safeHttpUrl(b.coverUrl) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={safeHttpUrl(b.coverUrl) ?? undefined}
          alt=""
          className="size-12 shrink-0 rounded-lg object-cover ring-1 ring-slate-200"
        />
      ) : (
        <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-600 ring-1 ring-sky-100">
          <Newspaper className="size-5" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-sm font-semibold text-navy">{b.title}</span>
        {b.excerpt ? (
          <span className="mt-0.5 line-clamp-1 block text-xs text-slate-500">{b.excerpt}</span>
        ) : null}
      </span>
    </Link>
  );
}

/** One testimonial card — reused in the right panel and the mobile/tablet section. */
function TestimonialCard({ t }: { t: TestimonialDto }) {
  return (
    <Card className="p-5">
      <QuoteIcon className="size-5 text-orange/70" aria-hidden="true" />
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{t.quote}</p>
      <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3">
        {safeHttpUrl(t.avatarUrl) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={safeHttpUrl(t.avatarUrl) ?? undefined}
            alt=""
            className="size-9 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
          />
        ) : (
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
            {t.authorName.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-navy">{t.authorName}</span>
          {t.authorTitle ? (
            <span className="block truncate text-xs text-slate-500">{t.authorTitle}</span>
          ) : null}
        </span>
        {t.rating ? (
          <span className="flex items-center gap-0.5" aria-label={`${t.rating} out of 5`}>
            {Array.from({ length: t.rating }).map((_, idx) => (
              <Star key={idx} className="size-3.5 fill-amber-400 text-amber-400" />
            ))}
          </span>
        ) : null}
      </div>
    </Card>
  );
}

/** One "other opening" card — reused in the grid and the horizontal marquee. */
function OtherRoleCard({ o }: { o: JobPostingDto }) {
  return (
    <Link
      href={`/jobs/${o.slug}`}
      className="flex h-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
        <Briefcase className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-navy">{o.title}</span>
        <span className="block truncate text-xs text-slate-500">{o.companyName}</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-slate-300" />
    </Link>
  );
}

/**
 * One role, in full — the Prephasz Zone-C composition: a dark aurora hero over a
 * two-column light body (content cards + a sticky apply / at-a-glance / eligibility
 * rail), the same visual language as the board and the hubs.
 *
 * Shared between the server-rendered page and the client fallback for targeted roles,
 * so both render identically — the difference is only WHO could fetch the data.
 */
export function JobDetail({
  job,
  others,
  testimonials = [],
  blogs = [],
  placements = [],
}: {
  job: JobPostingDto;
  others: JobPostingDto[];
  testimonials?: TestimonialDto[];
  blogs?: BlogPostDto[];
  placements?: PlacementRecordDto[];
}) {
  const closes = deadlineLabel(job.applicationDeadline);
  const closed = job.status !== JobStatus.ACTIVE || closes?.tone === 'closed';
  const applyHref = safeHttpUrl(job.applyUrl);
  const logoSrc = safeHttpUrl(job.companyLogoUrl);
  const jd = safeHttpUrl(job.jdFileUrl);
  const pay = compensationLabel(job);
  const isInternship = job.jobKind === JobKind.INTERNSHIP;
  const hasInternshipDetails =
    isInternship &&
    Boolean(
      job.internshipDuration ||
        job.stipendRange ||
        job.stipendRemarks ||
        (job.hasPpo && (job.ppoCtc || job.ppoRemarks)),
    );
  // A freshly-posted role can carry almost no copy; keep the main column from rendering
  // empty so the page never looks broken.
  const hasBody = Boolean(
    job.description ||
      jd ||
      job.skills.length ||
      job.hiringStages.length ||
      job.hiringProcess ||
      job.aboutCompany ||
      hasInternshipDetails,
  );

  const eligibility = [
    job.education ? { label: 'Education', value: job.education } : null,
    job.departments.length ? { label: 'Departments', value: job.departments.join(', ') } : null,
    job.ugRequirement ? { label: 'UG', value: job.ugRequirement } : null,
    job.pgRequirement ? { label: 'PG', value: job.pgRequirement } : null,
    job.passoutYears.length ? { label: 'Passout years', value: job.passoutYears.join(', ') } : null,
    job.otherRequirements ? { label: 'Other', value: job.otherRequirements } : null,
  ].filter((x): x is { label: string; value: string } => x !== null);

  const headline: Fact[] = [
    job.location
      ? {
          icon: MapPin,
          label: 'Location',
          value: `${job.location}${job.workMode ? ` · ${WORK_MODE_LABEL[job.workMode]}` : ''}`,
        }
      : null,
    job.experience ? { icon: Briefcase, label: 'Experience', value: job.experience } : null,
    pay ? { icon: IndianRupee, label: 'Compensation', value: pay } : null,
  ].filter((x): x is Fact => x !== null);

  const glance = [
    pay ? { label: 'Compensation', value: pay } : null,
    job.openings ? { label: 'Openings', value: String(job.openings) } : null,
    job.workMode ? { label: 'Work mode', value: WORK_MODE_LABEL[job.workMode] } : null,
  ].filter((x): x is { label: string; value: string } => x !== null);

  const jdTile = jd ? (
    <a
      href={jd}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:bg-slate-50"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
        <FileText className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-navy">
          {job.jdFileName || 'Full job description'}
        </span>
        <span className="text-xs text-slate-500">PDF · opens in a new tab</span>
      </span>
      <span className="text-xs font-semibold text-slate-400">Open</span>
    </a>
  ) : null;

  // Placement stories + highlights live in a third rightmost column on wide screens
  // (xl+); below that they fall back to full-width sections. The grid only becomes
  // three columns when there is something to show there.
  const rightItems: React.ReactNode[] = [
    ...placements.map((p) => <PlacementCard key={`p-${p.id}`} p={p} />),
    ...testimonials.map((t) => <TestimonialCard key={`t-${t.id}`} t={t} />),
  ];
  const hasRightPanel = rightItems.length > 0;
  const gridClass = hasRightPanel
    ? 'mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_300px_340px]'
    : 'mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]';

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-10">
      {/* Dark aurora hero — the same one the board and hubs use. */}
      <Reveal>
        <section className="relative isolate overflow-hidden rounded-2xl p-6 text-white shadow-sm sm:p-8">
          <AuroraBackground />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10"
          />
          <div className="relative z-10">
            <Link
              href="/jobs"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/15"
            >
              <ArrowLeft className="size-3.5" /> All jobs
            </Link>

            <div className="mt-6 flex items-start gap-4">
              {logoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoSrc}
                  alt=""
                  className="size-14 shrink-0 rounded-2xl bg-white object-contain p-1.5 ring-1 ring-white/15"
                />
              ) : (
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/10 text-white ring-1 ring-white/15">
                  <Briefcase className="size-6" />
                </span>
              )}
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/45">
                  {JOB_KIND_LABEL[job.jobKind]}
                </p>
                <h1 className="mt-1 bg-gradient-to-b from-white to-white/70 bg-clip-text text-3xl font-extrabold leading-[1.1] tracking-tight text-transparent sm:text-[40px]">
                  {job.title}
                </h1>
                <p className="mt-1 text-white/65">{job.companyName}</p>
              </div>
            </div>

            {headline.length > 0 ? (
              <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {headline.map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-3"
                  >
                    <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/45">
                      <Icon className="size-3.5 text-[#ffc42d]" /> {label}
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-white">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </section>
      </Reveal>

      <div className={gridClass}>
        {/* Main column */}
        <div className="space-y-6">
          {closed ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-600">
              This role is no longer accepting applications. It stays here so shared links keep
              working — browse the board for live openings.
            </div>
          ) : null}

          {hasInternshipDetails ? (
            <Reveal>
              <Card className="p-6">
                <Label>Internship details</Label>
                <dl className="mt-3 space-y-3 text-sm">
                  {job.internshipDuration ? (
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-slate-500">Duration</dt>
                      <dd className="font-semibold text-navy">{job.internshipDuration}</dd>
                    </div>
                  ) : null}
                  {job.stipendRange || job.stipendRemarks ? (
                    <div>
                      <dt className="text-slate-500">Stipend</dt>
                      <dd className="mt-0.5 font-semibold text-navy">
                        {job.stipendRange}
                        {job.stipendStructure ? (
                          <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                            {STRUCTURE_LABEL[job.stipendStructure]}
                          </span>
                        ) : null}
                      </dd>
                      {job.stipendRemarks ? (
                        <dd className="mt-1 text-xs leading-relaxed text-slate-500">
                          {job.stipendRemarks}
                        </dd>
                      ) : null}
                    </div>
                  ) : null}
                  {job.hasPpo && (job.ppoCtc || job.ppoRemarks) ? (
                    <div>
                      <dt className="text-slate-500">Full-time CTC (PPO)</dt>
                      <dd className="mt-0.5 font-semibold text-navy">
                        {job.ppoCtc}
                        {job.ppoStructure ? (
                          <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                            {STRUCTURE_LABEL[job.ppoStructure]}
                          </span>
                        ) : null}
                      </dd>
                      {job.ppoRemarks ? (
                        <dd className="mt-1 text-xs leading-relaxed text-slate-500">
                          {job.ppoRemarks}
                        </dd>
                      ) : null}
                    </div>
                  ) : null}
                </dl>
              </Card>
            </Reveal>
          ) : null}

          {!hasBody ? (
            <Reveal>
              <Card className="p-6">
                <Label>About the role</Label>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {job.companyName} hasn&rsquo;t shared a detailed description for this{' '}
                  {JOB_KIND_LABEL[job.jobKind].toLowerCase()} yet.{' '}
                  {closed
                    ? 'This role is no longer accepting applications.'
                    : applyHref
                      ? 'Apply on their site to see the full details and requirements.'
                      : 'Apply in one click and we’ll share your ZSkillup profile with them.'}
                </p>
              </Card>
            </Reveal>
          ) : null}

          {job.description ? (
            <Reveal>
              <Card className="p-6">
                <Label>About the role</Label>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                  {job.description}
                </p>
                {jdTile}
              </Card>
            </Reveal>
          ) : jd ? (
            <Reveal>
              <Card className="p-6">
                <Label>Job description</Label>
                {jdTile}
              </Card>
            </Reveal>
          ) : null}

          {job.skills.length > 0 ? (
            <Reveal>
              <Card className="p-6">
                <Label>Key skills</Label>
                <div className="mt-3 flex flex-wrap gap-2">
                  {job.skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </Card>
            </Reveal>
          ) : null}

          {job.hiringStages.length > 0 ? (
            <Reveal>
              <Card className="p-6">
                <Label>Hiring process</Label>
                <ol className="mt-3 space-y-2.5">
                  {job.hiringStages.map((stage, i) => (
                    <li key={`${stage}-${i}`} className="flex items-start gap-3">
                      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-navy text-[11px] font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="text-sm leading-relaxed text-slate-700">{stage}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            </Reveal>
          ) : job.hiringProcess ? (
            <Reveal>
              <Card className="p-6">
                <Label>Hiring process</Label>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                  {job.hiringProcess}
                </p>
              </Card>
            </Reveal>
          ) : null}

          {job.aboutCompany ? (
            <Reveal>
              <Card className="p-6">
                <Label>About {job.companyName}</Label>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                  {job.aboutCompany}
                </p>
              </Card>
            </Reveal>
          ) : null}
        </div>

        {/* Sticky rail */}
        <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <Card>
            <Label>Apply</Label>
            {closed ? (
              <p className="mt-3 text-sm text-slate-600">Applications are closed for this role.</p>
            ) : applyHref ? (
              <>
                <Button asChild size="lg" className="mt-3 w-full">
                  <a href={applyHref} target="_blank" rel="noopener noreferrer">
                    Apply on the company site
                  </a>
                </Button>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  {job.companyName} takes applications directly, so this one isn&apos;t tracked in
                  your ZSkillup applications.
                </p>
              </>
            ) : (
              <div className="mt-3">
                <ApplyButton slug={job.slug} jobId={job.id} jobTitle={job.title} />
              </div>
            )}
          </Card>

          {glance.length > 0 || closes ? (
            <Card>
              <Label>At a glance</Label>
              <dl className="mt-3 space-y-2.5">
                {glance.map((g) => (
                  <div key={g.label} className="flex items-center justify-between gap-3">
                    <dt className="text-xs text-slate-500">{g.label}</dt>
                    <dd className="text-sm font-semibold text-navy">{g.value}</dd>
                  </div>
                ))}
                {closes ? (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-xs text-slate-500">Apply by</dt>
                    <dd>
                      <StatusPill tone={DEADLINE_TONE[closes.tone]} label={closes.text} />
                    </dd>
                  </div>
                ) : null}
              </dl>
            </Card>
          ) : null}

          {eligibility.length > 0 ? (
            <Card>
              <Label>Who can apply</Label>
              <dl className="mt-3 space-y-3">
                {eligibility.map((e) => (
                  <div key={e.label}>
                    <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                      {e.label}
                    </dt>
                    <dd className="mt-0.5 text-sm text-slate-700">{e.value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          ) : null}
        </div>

        {/* Right column (xl+): placement stories & highlights as a sponsored-style rail.
            Below xl this is hidden and the same content renders full-width further down. */}
        {hasRightPanel ? (
          <aside className="hidden xl:col-start-3 xl:row-start-1 xl:block">
            <div className="xl:sticky xl:top-6">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Placement stories
              </p>
              <h2 className="mb-3 mt-1 text-base font-bold text-navy">Where our students landed</h2>
              {rightItems.length > 4 ? (
                <Marquee
                  direction="y"
                  durationSec={44}
                  items={rightItems}
                  className="h-[calc(100vh-9rem)]"
                />
              ) : (
                <div className="space-y-4">{rightItems}</div>
              )}
            </div>
          </aside>
        ) : null}
      </div>

      {/* Below xl the placement panel can't fit as a column, so it renders full-width here. */}
      {placements.length > 0 ? (
        <section className="mt-10 xl:hidden">
          <Label>Where our students landed</Label>
          <h2 className="mt-1 text-lg font-bold text-navy">Placement highlights</h2>
          {placements.length > 3 ? (
            <Marquee
              durationSec={46}
              className="mt-4"
              items={placements.map((p) => (
                <div key={p.id} className="w-[300px]">
                  <PlacementCard p={p} />
                </div>
              ))}
            />
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {placements.map((p, i) => (
                <RevealX key={p.id} from={i % 2 === 0 ? 'left' : 'right'} delay={(i % 3) * 0.04}>
                  <PlacementCard p={p} />
                </RevealX>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {testimonials.length > 0 ? (
        <section className="mt-10 xl:hidden">
          <Label>What students say</Label>
          <h2 className="mt-1 text-lg font-bold text-navy">Placement stories</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {testimonials.map((t, i) => (
              <RevealX key={t.id} from={i % 2 === 0 ? 'left' : 'right'} delay={(i % 2) * 0.05}>
                <TestimonialCard t={t} />
              </RevealX>
            ))}
          </div>
        </section>
      ) : null}

      {blogs.length > 0 ? (
        <section className="mt-10">
          <Label>Related reading</Label>
          <h2 className="mt-1 text-lg font-bold text-navy">From the blog</h2>
          {blogs.length > 3 ? (
            <Marquee
              durationSec={48}
              className="mt-4"
              items={blogs.map((b) => (
                <div key={b.id} className="w-[320px]">
                  <Card>
                    <BlogRow b={b} />
                  </Card>
                </div>
              ))}
            />
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {blogs.map((b) => (
                <Card key={b.id}>
                  <BlogRow b={b} />
                </Card>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {others.length > 0 ? (
        <section className="mt-10">
          <Label>More roles</Label>
          <h2 className="mt-1 text-lg font-bold text-navy">Other openings</h2>
          {others.length > 4 ? (
            <Marquee
              durationSec={52}
              className="mt-4"
              items={others.map((o) => (
                <div key={o.id} className="w-[300px]">
                  <OtherRoleCard o={o} />
                </div>
              ))}
            />
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {others.map((o, i) => (
                <RevealX key={o.id} from={i % 2 === 0 ? 'left' : 'right'} delay={(i % 2) * 0.05}>
                  <OtherRoleCard o={o} />
                </RevealX>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
