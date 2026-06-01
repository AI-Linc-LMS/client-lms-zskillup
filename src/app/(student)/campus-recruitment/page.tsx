import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { MapPin, Calendar, DollarSign, CheckCircle, Clock, BookOpen } from 'lucide-react';

const DEMO_COMPANIES = [
  {
    id: 'tcs',
    name: 'TCS',
    driveName: 'TCS NQT 2026',
    date: 'May 16, 2026',
    location: 'VIT Vellore',
    ctc: '3.36 â€“ 7 LPA',
    cgpa: '6.5',
    branches: 'CSE / IT / ECE',
    status: 'Eligible' as const,
    gradientFrom: 'from-blue-600',
    gradientTo: 'to-blue-800',
    initial: 'T',
  },
  {
    id: 'infosys',
    name: 'Infosys',
    driveName: 'Infosys InfyTQ 2026',
    date: 'May 28, 2026',
    location: 'Online',
    ctc: '3.6 â€“ 8 LPA',
    cgpa: '6.5',
    branches: 'CSE / IT / ECE',
    status: 'Registration Open' as const,
    gradientFrom: 'from-indigo-500',
    gradientTo: 'to-indigo-700',
    initial: 'I',
  },
  {
    id: 'capgemini',
    name: 'Capgemini',
    driveName: 'Capgemini Fresher Drive',
    date: 'Jun 4, 2026',
    location: 'Online',
    ctc: '3.8 â€“ 6.5 LPA',
    cgpa: '6.5',
    branches: 'CSE / IT / ECE',
    status: 'Registration Open' as const,
    gradientFrom: 'from-sky-500',
    gradientTo: 'to-sky-700',
    initial: 'C',
  },
  {
    id: 'wipro',
    name: 'Wipro',
    driveName: 'Wipro WILP 2026',
    date: 'Jun 12, 2026',
    location: 'VIT Vellore',
    ctc: '3.5 â€“ 6 LPA',
    cgpa: '6.5',
    branches: 'CSE / IT / ECE',
    status: 'Registered' as const,
    gradientFrom: 'from-violet-500',
    gradientTo: 'to-violet-700',
    initial: 'W',
  },
];

const MY_APPLICATIONS = [
  {
    id: 'tcs-app',
    company: 'TCS',
    driveName: 'TCS NQT 2026',
    appliedDate: 'May 2, 2026',
    status: 'Shortlisted' as const,
  },
  {
    id: 'wipro-app',
    company: 'Wipro',
    driveName: 'Wipro WILP 2026',
    appliedDate: 'May 8, 2026',
    status: 'Under Review' as const,
  },
];

type DriveStatus = 'Eligible' | 'Registration Open' | 'Registered';
type AppStatus = 'Shortlisted' | 'Under Review' | 'Rejected' | 'Selected';

function DriveStatusPill({ status }: { status: DriveStatus }) {
  if (status === 'Eligible') {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
        {status}
      </span>
    );
  }
  if (status === 'Registration Open') {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
      {status}
    </span>
  );
}

function AppStatusPill({ status }: { status: AppStatus }) {
  if (status === 'Shortlisted') {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
        {status}
      </span>
    );
  }
  if (status === 'Under Review') {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        {status}
      </span>
    );
  }
  if (status === 'Rejected') {
    return (
      <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
        {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
      {status}
    </span>
  );
}

export default function CampusRecruitmentPage() {
  const crumbs = [
    { label: 'Home', href: '/' },
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Campus Recruitment' },
  ];

  return (
    <div className="space-y-6 px-6 py-6">
      <Breadcrumb items={crumbs} />

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-navy">Campus Recruitment</h1>
        <p className="mt-1 text-sm text-slate-600">Stay ahead of every drive</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Upcoming Drives</p>
          <p className="mt-2 text-[26px] font-extrabold text-navy">4</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Applied</p>
          <p className="mt-2 text-[26px] font-extrabold text-navy">2</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Shortlisted</p>
          <p className="mt-2 text-[26px] font-extrabold text-navy">1</p>
        </div>
      </div>

      {/* Upcoming Drives */}
      <section>
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Upcoming Drives</p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
          {DEMO_COMPANIES.map((company) => (
            <div
              key={company.id}
              className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
            >
              {/* Company gradient banner */}
              <div className={`bg-gradient-to-r ${company.gradientFrom} ${company.gradientTo} px-5 py-4 flex items-center gap-3`}>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-lg font-bold text-white">
                  {company.initial}
                </div>
                <div>
                  <p className="font-bold text-white">{company.name}</p>
                  <p className="text-xs text-white/80">{company.driveName}</p>
                </div>
                <div className="ml-auto">
                  <DriveStatusPill status={company.status} />
                </div>
              </div>

              {/* Card body */}
              <div className="px-5 py-4 space-y-3">
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  <span className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar className="size-3.5 shrink-0" aria-hidden="true" />
                    {company.date}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-slate-400">
                    <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                    {company.location}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-slate-400">
                    <DollarSign className="size-3.5 shrink-0" aria-hidden="true" />
                    {company.ctc}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
                    <CheckCircle className="size-3 text-emerald-500" aria-hidden="true" />
                    CGPA â‰¥ {company.cgpa}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
                    <BookOpen className="size-3 text-navy" aria-hidden="true" />
                    {company.branches}
                  </span>
                </div>

                <div className="flex items-center justify-end pt-1">
                  {company.status === 'Registered' ? (
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                      View Details
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="rounded-full bg-orange px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
                    >
                      Register
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* My Applications */}
      <section>
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">My Applications</p>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
          {MY_APPLICATIONS.map((app) => (
            <div key={app.id} className="flex items-center justify-between px-5 py-4">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-navy">{app.company}</p>
                <p className="text-xs text-slate-400">{app.driveName}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="size-3.5" aria-hidden="true" />
                  Applied {app.appliedDate}
                </span>
                <AppStatusPill status={app.status} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}