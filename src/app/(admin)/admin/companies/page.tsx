import { Suspense } from 'react';
import { Building2 } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { CompaniesAdmin } from '@/components/superadmin/CompaniesAdmin';

/** Admin console — Companies (recruiter hubs). Same tooling as Super Admin. */
export default function AdminCompaniesPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Platform Admin', href: '/admin/dashboard' }, { label: 'Companies' }]} />
      <ConsoleHero
        icon={Building2}
        eyebrow="Platform Admin"
        title="Companies"
        description="Add a recruiter hub or change what students can see. Drafts stay hidden until published."
      />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />}>
        <CompaniesAdmin />
      </Suspense>
    </div>
  );
}
