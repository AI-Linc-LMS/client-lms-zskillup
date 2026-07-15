import { Suspense } from 'react';
import { Code2 } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { CodingAdmin } from '@/components/superadmin/CodingAdmin';

/**
 * Super-admin: Coding-bank console. Lists every coding problem with its company
 * tag, provenance (source + year), Judge0 verification status, and the source
 * citation link (where a sourced/PYQ problem was taken from).
 */
export default function AdminCodingPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Super-admin', href: '/superadmin/dashboard' },
          { label: 'Coding bank' },
        ]}
      />

      <ConsoleHero
        icon={Code2}
        eyebrow="Super Admin"
        title="Coding bank"
        description="Company-tagged coding problems. Each shows its provenance, Judge0 verification status, and - for sourced/PYQ problems - the citation link to where it came from."
      />

      <Suspense
        fallback={
          <div className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />
        }
      >
        <CodingAdmin />
      </Suspense>
    </div>
  );
}
