'use client';

import { useEffect, useState } from 'react';
import { History, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { loadCompanyNameMap } from '@/lib/company-name-map';

/**
 * "Previous year question" tag — shows which company(ies) and year(s) a question
 * was asked in, so a student knows it's a real PYQ while practising. For an
 * AI-generated pattern-based question (no company/year tag) it instead shows a
 * "SIMILAR PATTERN" chip. Renders nothing for a plain untagged question.
 */
export function PyqTag({
  companyIds = [],
  years = [],
  source,
  className,
}: {
  companyIds?: string[];
  years?: number[];
  /** Question source; `PATTERN_BASED` (with no company/year) → "SIMILAR PATTERN". */
  source?: string | null;
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

  // AI pattern-based question with no company/year → "SIMILAR PATTERN" chip.
  if (!hasCompanies && !hasYears) {
    if (source === 'PATTERN_BASED') {
      return (
        <span
          className={cn(
            'inline-flex max-w-full items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700 ring-1 ring-inset ring-violet-200',
            className,
          )}
          title="Practice question generated in the same pattern as real exam questions (not a specific company's paper)."
        >
          <Sparkles className="size-3 shrink-0" aria-hidden="true" />
          <span className="truncate">SIMILAR PATTERN</span>
        </span>
      );
    }
    return null;
  }

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
