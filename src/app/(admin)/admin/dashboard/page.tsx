import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Reveal } from '@/components/motion/primitives';
import { ShieldCheck } from 'lucide-react';
import { PlatformOverviewLive } from '@/components/superadmin/PlatformOverviewLive';
import { CompanyStatsCharts } from '@/components/superadmin/CompanyStatsCharts';
import { RevenueCharts } from '@/components/superadmin/RevenueCharts';

/**
 * Platform Admin console home. The internal operator's overview — platform
 * counts + company activity — plus onboarding (college requests) and the catalog
 * tools in the sidebar. User management + role changes remain Super-Admin-only.
 */
export const dynamic = 'force-dynamic';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Platform Admin' }, { label: 'Dashboard' }]} />

      <Reveal>
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1f2d4d] via-[#16223f] to-[#0b1220] p-6 text-white shadow-sm sm:p-8">
          <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[#6d3bf5]/25 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-white/70 ring-1 ring-inset ring-white/15">
              <ShieldCheck className="size-3.5" /> Platform Admin
            </span>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Operations console</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/60">
              Onboard colleges, author the catalog (companies, questions, coding, mocks, courses), and
              track platform activity. Use the sidebar to jump in.
            </p>
          </div>
        </section>
      </Reveal>

      <PlatformOverviewLive />
      <RevenueCharts />
      <CompanyStatsCharts />
    </div>
  );
}
