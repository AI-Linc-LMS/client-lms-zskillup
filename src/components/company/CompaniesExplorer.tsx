'use client';

import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CompanyCard } from './CompanyCard';
import {
  COMPANY_TYPE_TABS,
  DEMO_COMPANIES,
  type CompanyType,
  type Difficulty,
} from '@/lib/demo-data';

const DIFFICULTIES: ('All' | Difficulty)[] = ['All', 'Easy', 'Medium', 'Hard'];

/**
 * Companies explorer (demo screenshot): Service/Product/Consulting tabs +
 * difficulty filter + responsive card grid. Client component — the tabs and
 * filter are interactive; cards are presentational.
 */
export function CompaniesExplorer() {
  const [type, setType] = useState<'All' | CompanyType>('All');
  const [difficulty, setDifficulty] = useState<'All' | Difficulty>('All');

  const filtered = DEMO_COMPANIES.filter(
    (c) => (type === 'All' || c.type === type) && (difficulty === 'All' || c.difficulty === difficulty),
  );

  const typeCount = (key: 'All' | CompanyType) =>
    key === 'All' ? DEMO_COMPANIES.length : DEMO_COMPANIES.filter((c) => c.type === key).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex flex-wrap gap-4" role="tablist" aria-label="Company type">
          {COMPANY_TYPE_TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={type === t.key}
              onClick={() => setType(t.key)}
              className={cn(
                'flex items-center gap-1.5 border-b-2 pb-2 text-sm font-medium transition-colors',
                type === t.key
                  ? 'border-orange text-orange'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
              <span className="rounded-full bg-muted px-1.5 text-[11px]">{typeCount(t.key)}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-xs text-muted-foreground">Difficulty</span>
          <div className="flex gap-1">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  difficulty === d ? 'bg-navy text-white' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="py-3 text-xs text-muted-foreground">
        Showing {filtered.length} of {DEMO_COMPANIES.length} companies
      </p>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((c) => (
          <CompanyCard key={c.slug} company={c} />
        ))}
      </div>
    </div>
  );
}
