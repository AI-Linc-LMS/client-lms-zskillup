import { Briefcase, ShieldCheck, Zap } from 'lucide-react';
import { JobBoard } from '@/components/jobs/JobBoard';

/**
 * The job board.
 *
 * The list itself is a CLIENT component and deliberately not server-rendered. It has
 * to reflect who is asking - a posting targeted at one college appears for its
 * students and nobody else - and prerendering it would either bake one audience's view
 * into a shared cache or force every visitor through a dynamic render for a list most
 * of them see identically. The frame below is static; the list personalises itself.
 */
export const metadata = {
  title: 'Jobs & Internships · prephasz',
  description:
    'Live openings for students and freshers - roles, locations, eligibility and how to apply.',
};

const POINTS = [
  { icon: ShieldCheck, text: 'Every role posted by a verified hiring partner' },
  { icon: Zap, text: 'Apply in one click with the profile you built here' },
  { icon: Briefcase, text: 'Track every application in one place' },
];

export default function JobsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Job board</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-navy sm:text-[42px] sm:leading-tight">
        Openings for students and freshers
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
        Browse every live role in full - eligibility, hiring process and pay. Reading is always
        free; applying needs a plan.
      </p>

      <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
        {POINTS.map(({ icon: Icon, text }) => (
          <li key={text} className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
            <Icon className="size-4 text-emerald-600" aria-hidden="true" /> {text}
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <JobBoard />
      </div>
    </div>
  );
}
