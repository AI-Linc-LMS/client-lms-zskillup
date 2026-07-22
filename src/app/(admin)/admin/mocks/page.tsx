import { Suspense } from 'react';
import { FileCheck2 } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { MocksAdmin } from '@/components/superadmin/MocksAdmin';

/** Admin console - Mock tests (company-wise + sectional mocks). */
export default function AdminMocksPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Platform Admin', href: '/admin/dashboard' }, { label: 'Mock tests' }]} />
      <ConsoleHero
        icon={FileCheck2}
        eyebrow="Platform Admin"
        title="Mock tests"
        description="Assemble timed mock assessments from the question + coding banks."
      />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />}>
        <MocksAdmin />
      </Suspense>
    </div>
  );
}
