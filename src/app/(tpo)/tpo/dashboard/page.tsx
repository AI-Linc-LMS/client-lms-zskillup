import { Breadcrumb } from '@/components/layout/Breadcrumb';

const atRiskStudents = [
  { name: 'Arjun Mehta', branch: 'CSE', pps: 12, lastActive: '18 days ago' },
  { name: 'Priya Nair', branch: 'IT', pps: 18, lastActive: '21 days ago' },
  { name: 'Rahul Singh', branch: 'ECE', pps: 24, lastActive: '14 days ago' },
  { name: 'Sneha Rao', branch: 'CSE', pps: 27, lastActive: '16 days ago' },
  { name: 'Karan Patel', branch: 'EEE', pps: 29, lastActive: '15 days ago' },
];

const companyReadiness = [
  { company: 'TCS NQT', percent: 68, count: 138 },
  { company: 'Infosys InfyTQ', percent: 41, count: 140 },
  { company: 'Capgemini', percent: 52, count: 178 },
  { company: 'Wipro', percent: 44, count: 151 },
];

const ppsBands = [
  { label: 'AT_RISK', range: '< 30', count: 24, color: 'bg-red-50 text-red-700 border border-red-200' },
  { label: 'IN_TRAINING', range: '30â€“59', count: 186, color: 'bg-amber-50 text-amber-700 border border-amber-200' },
  { label: 'READY', range: '60â€“79', count: 98, color: 'bg-sky-50 text-sky-700 border border-sky-200' },
  { label: 'STRONG', range: '80+', count: 34, color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
];

export default function TpoDashboardPage() {
  return (
    <div className="space-y-8 p-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'TPO Dashboard' },
        ]}
      />

      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-navy">TPO Dashboard</h1>
        <p className="mt-0.5 text-sm text-slate-600">VIT Vellore Â· CSE 2026 batch</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total Students', value: '342', sub: 'Enrolled this batch' },
          { label: 'Active This Week', value: '187', sub: '55% of cohort' },
          { label: 'Avg PPS', value: '58', sub: 'Cohort average' },
          { label: 'At-Risk', value: '24', sub: 'PPS < 30 or 14-day inactive', accent: true },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 flex flex-col gap-1"
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {kpi.label}
            </p>
            <p className={`text-[26px] font-extrabold leading-none ${kpi.accent ? 'text-red-600' : 'text-navy'}`}>
              {kpi.value}
            </p>
            <p className="text-xs text-slate-400">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* At-Risk Students */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">
            Intervention Required
          </p>
          <h2 className="font-bold text-navy">At-Risk Students</h2>
          <p className="text-xs text-slate-400 mt-0.5">PPS below 30 or inactive for 14+ days</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="px-6 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Student Name
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Branch
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  PPS
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Last Active
                </th>
                <th className="px-6 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {atRiskStudents.map((student, idx) => (
                <tr
                  key={student.name}
                  className={`border-b border-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                >
                  <td className="px-6 py-3 font-medium text-navy">{student.name}</td>
                  <td className="px-4 py-3 text-slate-600">{student.branch}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                      {student.pps}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{student.lastActive}</td>
                  <td className="px-6 py-3">
                    <button
                      type="button"
                      className="rounded-full bg-orange px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
                    >
                      Send Nudge
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Company Readiness */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">
          Placement Pipeline
        </p>
        <h2 className="font-bold text-navy mb-5">Company Readiness</h2>
        <div className="space-y-4">
          {companyReadiness.map((item) => (
            <div key={item.company} className="flex items-center gap-4">
              <span className="w-36 shrink-0 text-sm font-medium text-slate-600">{item.company}</span>
              <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-navy"
                  style={{ width: `${item.percent}%` }}
                  aria-label={`${item.percent}% ready`}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-sm font-bold text-navy">{item.percent}%</span>
              <span className="w-36 shrink-0 text-xs text-slate-400">{item.count} students ready</span>
            </div>
          ))}
        </div>
      </section>

      {/* PPS Distribution */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">
          Cohort Snapshot
        </p>
        <h2 className="font-bold text-navy mb-5">PPS Distribution</h2>
        <div className="flex flex-wrap gap-4">
          {ppsBands.map((band) => (
            <div
              key={band.label}
              className={`flex flex-col items-center gap-1.5 rounded-xl border px-6 py-4 ${band.color}`}
            >
              <span className="text-[10px] font-semibold uppercase tracking-widest opacity-70">
                {band.label}
              </span>
              <span className="text-2xl font-extrabold">{band.count}</span>
              <span className="text-xs opacity-70">{band.range}</span>
              <span className="text-xs opacity-70">students</span>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mr-2">
          Quick Actions
        </p>
        {['Export CSV', 'Bulk Invite', 'Download Report'].map((action) => (
          <button
            key={action}
            type="button"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            {action}
          </button>
        ))}
      </div>
    </div>
  );
}