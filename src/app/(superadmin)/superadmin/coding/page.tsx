import { Suspense } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
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

      <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm sm:px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(249,115,22,0.12),_transparent_30%),linear-gradient(135deg,_rgba(15,23,42,0.03),_rgba(248,250,252,1))]" />
        <div className="relative max-w-3xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Catalog
          </p>
          <h1 className="mt-2 text-[28px] font-extrabold tracking-tight text-navy">Coding bank</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Company-tagged coding problems. Each shows its provenance, Judge0 verification status,
            and - for sourced/PYQ problems - the citation link to where it came from.
          </p>
        </div>
      </header>

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
