'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';

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
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search companies, topics…"
        aria-label="Search companies and topics"
        className="h-8 w-full rounded-full border border-slate-200 bg-slate-50 pl-8 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/30"
      />
    </form>
  );
}
