import { Breadcrumb } from '@/components/layout/Breadcrumb';
import {
  Building2,
  Users,
  ClipboardList,
  BarChart2,
  PlusCircle,
  Search,
  Trophy,
  Flag,
} from 'lucide-react';

const kpiCards = [
  { label: 'Total Colleges', value: '12', icon: Building2, sub: 'Institutions onboarded' },
  { label: 'Active Students', value: '4,842', icon: Users, sub: 'Across all colleges' },
  { label: 'Mocks Taken Today', value: '312', icon: ClipboardList, sub: 'In the last 24 hours' },
  { label: 'Avg Platform PPS', value: '61', icon: BarChart2, sub: 'Placement Readiness Score' },
];

const colleges = [
  { name: 'VIT Vellore', state: 'Tamil Nadu', students: 840, tpo: 'Dr. Meena Iyer', onboarded: '12 May 2026', status: 'Active' },
  { name: 'BITS Pilani', state: 'Rajasthan', students: 620, tpo: 'Prof. Arjun Das', onboarded: '18 May 2026', status: 'Active' },
  { name: 'SRM Chennai', state: 'Tamil Nadu', students: 510, tpo: 'Ms. Priya Nair', onboarded: '22 May 2026', status: 'Active' },
  { name: 'NIT Trichy', state: 'Tamil Nadu', students: 390, tpo: 'Dr. Rajan Kumar', onboarded: '28 May 2026', status: 'Onboarding' },
  { name: 'Manipal Institute', state: 'Karnataka', students: 275, tpo: 'Mr. Sanjay Hegde', onboarded: '31 May 2026', status: 'Onboarding' },
];

const healthItems = [
  { label: 'API', detail: 'Healthy', color: 'bg-emerald-500' },
  { label: 'Database', detail: '8/8 migrations', color: 'bg-emerald-500' },
  { label: 'Email Service', detail: 'Operational', color: 'bg-emerald-500' },
  { label: 'Background Jobs', detail: '3 running', color: 'bg-sky-500' },
];

const auditLog = [
  { message: 'College VIT Vellore onboarded by admin@zskillup.io', time: '2 hours ago' },
  { message: "Badge 'Speed Demon' created by admin@zskillup.io", time: '5 hours ago' },
  { message: 'Feature flag mock_retakes enabled for BITS Pilani', time: '8 hours ago' },
  { message: 'TPO account created for SRM Chennai: priya.nair@srm.edu', time: '1 day ago' },
  { message: 'Platform PPS recalibration job triggered manually', time: '2 days ago' },
];

const quickActions = [
  { label: 'Add College', icon: PlusCircle, href: '/superadmin/colleges/new' },
  { label: 'View Audit Log', icon: Search, href: '/superadmin/audit-log' },
  { label: 'Manage Badges', icon: Trophy, href: '/superadmin/badges' },
  { label: 'Feature Flags', icon: Flag, href: '/superadmin/feature-flags' },
];

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    Active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Onboarding: 'bg-amber-50 text-amber-700 border border-amber-200',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] ?? 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
      {status}
    </span>
  );
}

export default function SuperAdminDashboardPage() {
  return (
    <div className="space-y-8 p-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Super Admin Dashboard' },
        ]}
      />

      {/* Page header */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Super Admin Â· ZSkillup</p>
        <h1 className="mt-1 text-2xl font-bold text-navy">Platform Overview</h1>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpiCards.map(({ label, value, icon: Icon, sub }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
              <Icon className="size-4 text-slate-400" aria-hidden="true" />
            </div>
            <p className="text-[26px] font-extrabold leading-none text-navy">{value}</p>
            <p className="mt-1.5 text-xs text-slate-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* Recently Onboarded Colleges */}
      <section>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Recently Onboarded Colleges</p>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['College Name', 'State', 'Students', 'TPO', 'Onboarded', 'Status'].map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {colleges.map((college, i) => (
                <tr key={college.name} className={`border-b border-slate-100 last:border-0 ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                  <td className="px-4 py-3 font-medium text-navy">{college.name}</td>
                  <td className="px-4 py-3 text-slate-600">{college.state}</td>
                  <td className="px-4 py-3 text-slate-600">{college.students.toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-600">{college.tpo}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{college.onboarded}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={college.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Platform Health */}
      <section>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Platform Health</p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {healthItems.map(({ label, detail, color }) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className={`size-2.5 rounded-full ${color} shrink-0`} aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-navy">{label}</p>
                  <p className="text-xs text-slate-400">{detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom grid: Recent Activity + Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Admin Activity */}
        <section className="lg:col-span-2">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Recent Admin Activity</p>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
            {auditLog.map(({ message, time }) => (
              <div key={message} className="flex items-start justify-between gap-4 px-5 py-3.5">
                <p className="text-sm text-slate-600">{message}</p>
                <p className="shrink-0 text-xs text-slate-400">{time}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Quick Actions</p>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-2.5">
            {quickActions.map(({ label, icon: Icon, href }) => (
              <a
                key={label}
                href={href}
                className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Icon className="size-4 text-slate-400 shrink-0" aria-hidden="true" />
                {label}
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}