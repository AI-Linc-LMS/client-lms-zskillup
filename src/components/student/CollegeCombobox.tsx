'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, ChevronsUpDown, Loader2, Search } from 'lucide-react';
import { listColleges, suggestCollege, type College } from '@/lib/api/auth';
import { cn } from '@/lib/utils';

/**
 * Searchable college picker over the all-India directory (~1,400 institutions,
 * server-side search). Selecting a listed college sets its id (so the college
 * leaderboard + cohort scoping work). "Can't find it?" lets the student enter
 * their college as free text (saved as the display name, no id) and files a
 * request for it to be added to the directory.
 */
export function CollegeCombobox({
  collegeId,
  collegeName,
  onSelect,
  className,
}: {
  collegeId: string;
  collegeName: string;
  /** id is '' when the student entered a not-yet-listed college via "Other". */
  onSelect: (v: { id: string; name: string }) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<College[]>([]);
  const [loading, setLoading] = useState(false);
  const [otherMode, setOtherMode] = useState(false);
  const [other, setOther] = useState({ name: '', city: '', state: '' });
  const [submitting, setSubmitting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Debounced server-side search whenever the dropdown is open.
  useEffect(() => {
    if (!open || otherMode) return;
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      listColleges({ search: query.trim() || undefined, limit: 40 })
        .then((cs) => !cancelled && setResults(cs))
        .catch(() => !cancelled && setResults([]))
        .finally(() => !cancelled && setLoading(false));
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, open, otherMode]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setOtherMode(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const displayLabel = collegeId
    ? collegeName || 'Selected college'
    : collegeName
      ? `${collegeName} (not in list yet)`
      : 'Select your college';

  async function submitOther() {
    const name = other.name.trim();
    if (!name) return;
    setSubmitting(true);
    try {
      await suggestCollege({
        name,
        city: other.city.trim() || undefined,
        state: other.state.trim() || undefined,
      });
    } catch {
      /* best-effort - still let them save the name */
    }
    setSubmitting(false);
    onSelect({ id: '', name });
    setOpen(false);
    setOtherMode(false);
  }

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm transition focus:border-[#f5b400] focus:outline-none focus:ring-2 focus:ring-[#f5b400]/25"
      >
        <span className={cn('truncate', collegeId || collegeName ? 'text-navy' : 'text-slate-400')}>
          {displayLabel}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-slate-400" aria-hidden />
      </button>

      {open ? (
        <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_-24px_rgba(11,18,32,0.5)]">
          {!otherMode ? (
            <>
              <div className="flex items-center gap-2 border-b border-slate-100 px-3">
                <Search className="size-4 shrink-0 text-slate-400" aria-hidden />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search 1,400+ colleges…"
                  className="w-full bg-transparent py-2.5 text-sm text-navy placeholder:text-slate-400 focus:outline-none"
                />
              </div>
              <div className="max-h-64 overflow-y-auto py-1">
                {loading ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-400">
                    <Loader2 className="size-4 animate-spin" /> Searching…
                  </div>
                ) : results.length ? (
                  results.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onSelect({ id: c.id, name: c.name });
                        setOpen(false);
                      }}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition hover:bg-slate-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-navy">{c.name}</span>
                        {c.city || c.state ? (
                          <span className="block truncate text-[11px] text-slate-500">
                            {[c.city, c.state].filter(Boolean).join(', ')}
                          </span>
                        ) : null}
                      </span>
                      {c.id === collegeId ? <Check className="size-4 shrink-0 text-[#f5b400]" /> : null}
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-6 text-center text-xs text-slate-400">No colleges match &ldquo;{query}&rdquo;.</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setOther({ name: query.trim(), city: '', state: '' });
                  setOtherMode(true);
                }}
                className="flex w-full items-center justify-between border-t border-slate-100 bg-slate-50/60 px-3 py-2.5 text-left text-xs font-bold text-navy transition hover:bg-slate-100"
              >
                Can&apos;t find your college? Add it →
              </button>
            </>
          ) : (
            <div className="p-3.5">
              <button
                type="button"
                onClick={() => setOtherMode(false)}
                className="mb-2 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 transition hover:text-navy"
              >
                <ArrowLeft className="size-3.5" /> Back to search
              </button>
              <p className="text-xs font-bold text-navy">Request your college</p>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                We&apos;ll add it to the directory. It shows on your profile now; your college leaderboard
                activates once it&apos;s approved.
              </p>
              <div className="mt-2.5 space-y-2">
                <input
                  autoFocus
                  value={other.name}
                  onChange={(e) => setOther((o) => ({ ...o, name: e.target.value }))}
                  placeholder="College name *"
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-[#f5b400] focus:outline-none focus:ring-2 focus:ring-[#f5b400]/20"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={other.city}
                    onChange={(e) => setOther((o) => ({ ...o, city: e.target.value }))}
                    placeholder="City"
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-[#f5b400] focus:outline-none focus:ring-2 focus:ring-[#f5b400]/20"
                  />
                  <input
                    value={other.state}
                    onChange={(e) => setOther((o) => ({ ...o, state: e.target.value }))}
                    placeholder="State"
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-[#f5b400] focus:outline-none focus:ring-2 focus:ring-[#f5b400]/20"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={submitOther}
                disabled={submitting || !other.name.trim()}
                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy/90 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                Use this college &amp; request it
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
