'use client';

import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { loadCompanyNameMap } from '@/lib/company-name-map';

/**
 * "Previous year question" tag — shows which company(ies) and year(s) a question
 * was asked in, so a student knows it's a real PYQ while practising. Renders
 * nothing when the question has no company/year tags. Company names resolve from
 * a cached id→name map.
 */
export function PyqTag({
  companyIds = [],
  years = [],
  className,
}: {
  companyIds?: string[];
  years?: number[];
  className?: string;
}) {
  const [names, setNames] = useState<string[]>([]);

  const idKey = companyIds.join(',');
  useEffect(() => {
    if (companyIds.length === 0) {
      setNames([]);
      return;
    }
    let on = true;
    loadCompanyNameMap().then((m) => {
      if (on) setNames(companyIds.map((id) => m.get(id)).filter((x): x is string => !!x));
    });
    return () => {
      on = false;
    };
  }, [idKey]);

  const hasCompanies = names.length > 0;
  const hasYears = years.length > 0;
  if (!hasCompanies && !hasYears) return null;

  const companyStr = names.slice(0, 2).join(', ') + (names.length > 2 ? ` +${names.length - 2}` : '');
  const yearStr = [...years].sort((a, b) => b - a).slice(0, 3).join(', ');

  const label = hasCompanies
    ? `Asked in ${companyStr}${hasYears ? ` · ${yearStr}` : ''}`
    : `Past paper · ${yearStr}`;

  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-inset ring-amber-200',
        className,
      )}
      title={hasCompanies ? `Previously asked in ${names.join(', ')}${hasYears ? ` (${yearStr})` : ''}` : `Previous-year question (${yearStr})`}
    >
      <History className="size-3 shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </span>
  );
}
