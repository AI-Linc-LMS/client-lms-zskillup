import { Award, Lock, Download, Share2 } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';

const crumbs = [
  { label: 'Home', href: '/' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Certifications' },
];

const earnedCertificates = [
  {
    id: 'tcs-nqt-aptitude',
    title: 'TCS NQT Aptitude Foundation',
    issuer: 'ZSkillup Ã— TCS',
    dateEarned: 'Apr 18, 2026',
  },
  {
    id: 'verbal-foundations-l2',
    title: 'Verbal Foundations Level 2',
    issuer: 'ZSkillup',
    dateEarned: 'Mar 5, 2026',
  },
];

const inProgressCertificates = [
  {
    id: 'tcs-nqt-coding',
    title: 'TCS NQT Coding Proficiency',
    issuer: 'ZSkillup Ã— TCS',
    progress: 62,
  },
  {
    id: 'data-structures-fundamentals',
    title: 'Data Structures Fundamentals',
    issuer: 'ZSkillup',
    progress: 45,
  },
  {
    id: 'quantitative-reasoning-advanced',
    title: 'Quantitative Reasoning Advanced',
    issuer: 'ZSkillup',
    progress: 28,
  },
];

export default function CertificationsPage() {
  return (
    <div className="space-y-8 p-6">
      <Breadcrumb items={crumbs} />

      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="font-bold text-[22px] text-navy">Certifications</h1>
        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-0.5 text-xs font-semibold text-emerald-700">
          2 earned
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 max-w-lg">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Earned</span>
          <span className="text-[26px] font-extrabold text-navy leading-none">2</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">In Progress</span>
          <span className="text-[26px] font-extrabold text-navy leading-none">3</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Share-ready</span>
          <span className="text-[26px] font-extrabold text-navy leading-none">2</span>
        </div>
      </div>

      {/* Earned Certificates */}
      <section className="space-y-4">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Earned Certificates
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {earnedCertificates.map((cert) => (
            <div
              key={cert.id}
              className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
            >
              {/* Gold gradient top bar */}
              <div className="h-2 w-full bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500" />
              <div className="p-5 flex flex-col gap-4">
                {/* Icon + title */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 rounded-lg bg-amber-50 border border-amber-200 p-2">
                    <Award className="size-5 text-amber-500" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="font-bold text-navy text-sm leading-snug">{cert.title}</p>
                    <p className="text-xs text-slate-400">{cert.issuer}</p>
                  </div>
                </div>
                {/* Date */}
                <p className="text-xs text-slate-400">
                  Earned <span className="font-medium text-slate-600">{cert.dateEarned}</span>
                </p>
                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-full bg-orange px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
                  >
                    <Download className="size-3.5" aria-hidden="true" />
                    Download
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <Share2 className="size-3.5" aria-hidden="true" />
                    Share
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* In Progress */}
      <section className="space-y-4">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          In Progress
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {inProgressCertificates.map((cert) => (
            <div
              key={cert.id}
              className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden opacity-50"
            >
              {/* Muted top bar */}
              <div className="h-2 w-full bg-slate-200" />
              <div className="p-5 flex flex-col gap-4">
                {/* Icon + title */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 rounded-lg bg-slate-100 border border-slate-200 p-2">
                    <Lock className="size-5 text-slate-400" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="font-bold text-navy text-sm leading-snug">{cert.title}</p>
                    <p className="text-xs text-slate-400">{cert.issuer}</p>
                  </div>
                </div>
                {/* Progress */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Progress</span>
                    <span className="text-xs font-semibold text-navy">{cert.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-navy"
                      style={{ width: `${cert.progress}%` }}
                    />
                  </div>
                </div>
                {/* Action */}
                <button
                  type="button"
                  className="w-full rounded-full bg-orange px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
                >
                  Continue
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}