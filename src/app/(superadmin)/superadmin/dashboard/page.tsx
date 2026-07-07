import Link from 'next/link';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Building2,
  Brain,
  ClipboardList,
  Briefcase,
  Timer,
  Users,
} from 'lucide-react';
import { PlatformOverviewLive } from '@/components/superadmin/PlatformOverviewLive';
import { CompanyStatsCharts } from '@/components/superadmin/CompanyStatsCharts';
import { RevenueCharts } from '@/components/superadmin/RevenueCharts';

/**
 * Super-admin dashboard — a live, comprehensive platform overview. Counts and
 * trend telemetry come from `GET /admin/stats`, the college register from
 * `GET /admin/colleges`, and service health from the real `GET /ready` probe.
 */

const QUICK_ACTIONS = [
  { label: 'Student Reports', icon: BarChart3, href: '/superadmin/students' },
  { label: 'Users', icon: Users, href: '/superadmin/users' },
  { label: 'Courses', icon: BookOpen, href: '/superadmin/courses' },
  { label: 'Colleges', icon: Building2, href: '/superadmin/colleges' },
  { label: 'Companies', icon: Briefcase, href: '/superadmin/companies' },
  { label: 'Question Bank', icon: ClipboardList, href: '/superadmin/questions' },
  { label: 'Mock Tests', icon: Timer, href: '/superadmin/mocks' },
  { label: 'Adaptive', icon: Brain, href: '/superadmin/adaptive-sessions' },
];

export default function SuperAdminDashboardPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Super Admin Dashboard' }]} />

      {/* Gradient hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b1220] via-[#101d4a] to-[#1e3a8a] p-7 text-white shadow-lg sm:p-9">
        {/* glow + grid */}
        <div aria-hidden className="pointer-events-none absolute -left-20 -top-24 size-64 rounded-full bg-[#f37021]/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 right-0 size-72 rounded-full bg-white/[0.06] blur-3xl" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(rgb(255 255 255 / 0.9) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
            Super Admin · ZSkillup
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-[34px]">
            Platform Overview
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
            Everything happening across ZSkillup — users, assessments, content and system health,
            updated live.
          </p>

          {/* Quick actions */}
          <div className="mt-6 flex flex-wrap gap-2">
            {QUICK_ACTIONS.map(({ label, icon: Icon, href }) => (
              <Link
                key={label}
                href={href}
                className="group flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-4 py-2 text-sm font-medium text-white/90 backdrop-blur transition-colors hover:bg-white/[0.16]"
              >
                <Icon className="size-4 shrink-0 text-white/70" aria-hidden />
                {label}
                <ArrowUpRight className="size-3.5 text-white/40 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
              </Link>
            ))}
          </div>
        </div>
      </div>

      <PlatformOverviewLive />

      <div>
        <h2 className="mb-4 text-lg font-extrabold tracking-tight text-navy">Revenue & subscriptions</h2>
        <RevenueCharts />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-extrabold tracking-tight text-navy">Company drives & coverage</h2>
        <CompanyStatsCharts />
      </div>
    </div>
  );
}
