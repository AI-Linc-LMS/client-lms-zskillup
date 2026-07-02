import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Reveal } from '@/components/motion/primitives';
import { Building2, ClipboardCheck, KeyRound, ShieldCheck, Users } from 'lucide-react';

/**
 * Platform Admin console landing. The Admin is the internal operator that runs
 * college onboarding: creating registration requests, activating subscriptions,
 * and seeding student imports. The working surfaces land in the following
 * batches — this page establishes the role's home + shell.
 */
export const dynamic = 'force-dynamic';

const ROADMAP = [
  {
    icon: ClipboardCheck,
    title: 'College Registration Requests',
    body: 'Create a request with college details, subscription plan, and the shared student list; submit for Super Admin review; correct & resubmit if rejected.',
    when: 'Next',
  },
  {
    icon: KeyRound,
    title: 'Subscription activation & credentials',
    body: 'On approval, activate the college subscription and email the college its secure login link.',
    when: 'Soon',
  },
  {
    icon: Users,
    title: 'Cohorts & student import',
    body: 'Seed the first cohort from the approved student list; student accounts are generated and emailed their login links.',
    when: 'Soon',
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[{ label: 'Home', href: '/' }, { label: 'Platform Admin' }, { label: 'Dashboard' }]}
      />

      <Reveal>
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1f2d4d] via-[#16223f] to-[#0b1220] p-6 text-white shadow-sm sm:p-8">
          <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[#6d3bf5]/25 blur-3xl" />
          <span aria-hidden className="pointer-events-none absolute -bottom-20 left-1/4 size-56 rounded-full bg-[#4f7bf5]/20 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-white/70 ring-1 ring-inset ring-white/15">
              <ShieldCheck className="size-3.5" /> Platform Admin
            </span>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">College onboarding console</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/60">
              You&apos;re the internal operator for college onboarding. The tools below are rolling out in
              batches — Super Admin still owns final approval and role changes.
            </p>
          </div>
        </section>
      </Reveal>

      <div className="grid gap-4 md:grid-cols-3">
        {ROADMAP.map((c) => {
          const Icon = c.icon;
          return (
            <article
              key={c.title}
              className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.18)]"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {c.when}
                </span>
              </div>
              <h3 className="mt-4 text-base font-bold text-navy">{c.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{c.body}</p>
            </article>
          );
        })}
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 text-sm text-slate-500 shadow-sm">
        <Building2 className="size-5 shrink-0 text-slate-400" />
        Colleges, users, and role changes are managed by the Super Admin. Your onboarding actions appear here as each batch ships.
      </div>
    </div>
  );
}
