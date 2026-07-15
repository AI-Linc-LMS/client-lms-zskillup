'use client';

import { useState } from 'react';
import { IndianRupee } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { FinancialsPaymentsBoard } from '@/components/admin/FinancialsPaymentsBoard';
import { FinancialsDashboard } from '@/components/admin/FinancialsDashboard';

export default function SuperadminFinancialsPage() {
  const [tab, setTab] = useState<'collected' | 'projected'>('collected');
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Super Admin', href: '/superadmin/dashboard' },
          { label: 'Financials' },
        ]}
      />
      <ConsoleHero
        icon={IndianRupee}
        eyebrow="Super Admin"
        title="Financials"
        description="Collected revenue from real payments, with a date filter - plus a projected (MRR/ARR) view."
      />

      <div className="flex gap-1 border-b border-slate-200">
        {(
          [
            { key: 'collected', label: 'Collected (real)' },
            { key: 'projected', label: 'Projected (MRR/ARR)' },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.key
                ? 'border-orange text-navy'
                : 'border-transparent text-slate-500 hover:text-slate-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'collected' ? <FinancialsPaymentsBoard /> : <FinancialsDashboard />}
    </div>
  );
}
