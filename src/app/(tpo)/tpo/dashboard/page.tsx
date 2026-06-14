import Link from 'next/link';
import { ArrowRight, BarChart3, GraduationCap, Mail, ShieldCheck, Sparkles, Upload } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Button } from '@/components/ui/button';

/**
 * Placement Office (TPO / COLLEGE_ADMIN) home.
 *
 * Scoped to the caller's college (Implementation Plan §2). The live capability
 * today is bulk-inviting students (Sprint 1); cohort analytics — PPS, branch
 * performance, at-risk lists, exports — are a later release, so they are shown
 * as an honest, number-free preview rather than fabricated data.
 */

const STEPS = [
  {
    icon: Upload,
    title: 'Invite your cohort',
    body: 'Upload a CSV of student emails — each gets a secure sign-up link.',
  },
  {
    icon: GraduationCap,
    title: 'Students prepare',
    body: 'They practise by topic and company and take timed mock assessments.',
  },
  {
    icon: BarChart3,
    title: 'Track readiness',
    body: 'Cohort placement-readiness insights arrive in an upcoming release.',
  },
];

export default function TpoDashboardPage() {
  return (
    <div className="space-y-8">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Placement Office' }]} />

      {/* Hero */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Placement Office
        </p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy sm:text-[32px]">
          Your college placement workspace
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Onboard your students to ZSkillup and give them a structured path to placement readiness —
          company hubs, topic practice, and timed mock assessments. Start by inviting your cohort.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link href="/tpo/invitations">
              <Mail className="size-4" aria-hidden="true" /> Invite students
            </Link>
          </Button>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="size-3.5" aria-hidden="true" /> Scoped to your college only
          </span>
        </div>
      </section>

      {/* Primary action + upcoming */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Invite students — live */}
        <Link
          href="/tpo/invitations"
          className="group flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-orange/40 hover:bg-orange/5"
        >
          <span className="grid size-11 place-items-center rounded-xl bg-orange/10 text-orange ring-1 ring-orange/20">
            <Upload className="size-5" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-base font-bold text-navy">Bulk-invite students</h2>
          <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-600">
            Paste or upload a CSV of student emails. We create their accounts, send sign-up links,
            and report exactly which were created, skipped, or invalid.
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-orange">
            Open invitations
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </Link>

        {/* Cohort analytics — honest preview */}
        <div className="flex flex-col rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-6">
          <span className="grid size-11 place-items-center rounded-xl bg-slate-100 text-slate-400 ring-1 ring-slate-200">
            <BarChart3 className="size-5" aria-hidden="true" />
          </span>
          <div className="mt-4 flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-500">Cohort analytics</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              <Sparkles className="size-3" aria-hidden="true" /> Upcoming
            </span>
          </div>
          <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-500">
            Placement-readiness scores, branch performance, at-risk students, and downloadable
            reports for your cohort will appear here in a later release.
          </p>
        </div>
      </div>

      {/* How it works */}
      <section>
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          How it works
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <div key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="grid size-7 place-items-center rounded-full bg-navy text-xs font-bold text-white">
                  {i + 1}
                </span>
                <Icon className="size-4 text-slate-400" aria-hidden="true" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-navy">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
