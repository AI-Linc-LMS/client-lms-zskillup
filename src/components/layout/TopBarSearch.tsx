'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * TopBar search — Sprint 3 wires this to do something useful even though there's
 * no full-text search endpoint yet. Submitting:
 *
 *   - Routes the query into a known surface (company hub if the term matches a
 *     known company slug, otherwise the prepare catalog with the query baked
 *     into the URL for client-side filtering).
 *
 * A real search index lands later — this gives the user a sensible jump now.
 */
const KNOWN_COMPANIES = new Set([
  'tcs', 'infosys', 'wipro', 'cognizant', 'capgemini', 'accenture', 'deloitte', 'amazon', 'google',
]);

export function TopBarSearch() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim().toLowerCase();
    if (!term) return;
    if (KNOWN_COMPANIES.has(term)) {
      router.push(`/dashboard/company/${term}`);
    } else if (term.startsWith('topic:')) {
      router.push(`/practice?topic=${encodeURIComponent(term.slice(6))}`);
    } else {
      router.push(`/dashboard/company`);
    }
    setQ('');
  }

  return (
    <form onSubmit={onSubmit} className="relative ml-auto hidden max-w-xs flex-1 lg:block">
      {/* focus glow halo */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -inset-px rounded-full bg-gradient-to-r from-[#f37021]/40 via-[#6d3bf5]/30 to-[#2563eb]/40 opacity-0 blur-[6px] transition-opacity duration-300',
          focused && 'opacity-100',
        )}
      />
      <div className="relative">
        <Search
          className={cn(
            'pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 transition-colors duration-200',
            focused ? 'text-orange' : 'text-slate-400',
          )}
          aria-hidden="true"
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search companies, topics…"
          aria-label="Search companies and topics"
          className="h-9 w-full rounded-full border border-slate-200/90 bg-white/70 pl-10 pr-14 text-sm text-slate-700 shadow-sm transition-colors placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-transparent focus-visible:bg-white focus-visible:outline-none"
        />
        {/* kbd hint — hides while typing/focused */}
        <kbd
          aria-hidden
          className={cn(
            'pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 select-none items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-slate-400 transition-opacity duration-200 xl:inline-flex',
            focused || q ? 'opacity-0' : 'opacity-100',
          )}
        >
          <span className="text-[11px] leading-none">⌘</span>K
        </kbd>
      </div>
    </form>
  );
}
