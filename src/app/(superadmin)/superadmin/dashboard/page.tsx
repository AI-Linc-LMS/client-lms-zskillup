import Link from 'next/link';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { BookOpen, Building2, ClipboardList, PlusCircle, Timer } from 'lucide-react';
import { PlatformOverviewLive } from '@/components/superadmin/PlatformOverviewLive';

/**
 * Super-admin dashboard — fully live platform overview: counts from
 * `GET /admin/stats`, the college register from `GET /admin/colleges`, and
 * health from the real `GET /ready` probe (client leaf). Audit logging and
 * feature flags join in Sprint 8.
 */

const QUICK_ACTIONS = [
  { label: 'Manage Courses', icon: BookOpen, href: '/superadmin/courses' },
  { label: 'Manage Colleges', icon: PlusCircle, href: '/superadmin/colleges' },
  { label: 'Manage Companies', icon: Building2, href: '/superadmin/companies' },
  { label: 'Question Bank', icon: ClipboardList, href: '/superadmin/questions' },
  { label: 'Mock Tests', icon: Timer, href: '/superadmin/mocks' },
];

export default function SuperAdminDashboardPage() {
  return (
    <div className="space-y-8">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Super Admin Dashboard' }]} />

      {/* Page header + quick actions */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Super Admin · ZSkillup
          </p>
          <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">
            Platform Overview
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map(({ label, icon: Icon, href }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-navy"
            >
              <Icon className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </div>
      </div>

      <PlatformOverviewLive />
    </div>
  );
}
