import { Suspense } from 'react';
import { Code2 } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { CodingAdmin } from '@/components/superadmin/CodingAdmin';

/** Admin console — Coding bank (Judge0 problems). */
export default function AdminCodingPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Platform Admin', href: '/admin/dashboard' }, { label: 'Coding bank' }]} />
      <ConsoleHero
        icon={Code2}
        eyebrow="Platform Admin"
        title="Coding bank"
        description="Author DSA problems, test cases, and starter code; publish or archive."
      />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />}>
        <CodingAdmin />
      </Suspense>
    </div>
  );
}
