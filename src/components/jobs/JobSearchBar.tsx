'use client';

import { MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

const EXPERIENCE = ['Fresher', '0-1 years', '1-3 years', '3-5 years', '5+ years'];

/**
 * The one row people look for on a job site: what, how much experience, where.
 *
 * Submitting is explicit rather than debounced. The keyword box alone is
 * search-as-you-type on the board, but this bar composes three fields, and firing a
 * request on every keystroke across all three makes the location dropdown feel like it
 * is fighting the user.
 */
export function JobSearchBar({
  keyword,
  experience,
  location,
  locations,
  onKeyword,
  onExperience,
  onLocation,
  onSubmit,
}: {
  keyword: string;
  experience: string;
  location: string;
  locations: string[];
  onKeyword: (v: string) => void;
  onExperience: (v: string) => void;
  onLocation: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:flex-row sm:items-center sm:gap-0"
    >
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          value={keyword}
          onChange={(e) => onKeyword(e.target.value)}
          placeholder="Search roles, skills or companies"
          aria-label="Search roles, skills or companies"
          className="h-11 w-full rounded-xl border-0 bg-transparent pl-9 pr-3 text-sm text-navy placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
        />
      </div>

      <span className="hidden h-6 w-px bg-slate-200 sm:block" aria-hidden="true" />

      <select
        value={experience}
        onChange={(e) => onExperience(e.target.value)}
        aria-label="Experience"
        className="h-11 rounded-xl border-0 bg-transparent px-3 text-sm text-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30 sm:w-44"
      >
        <option value="">Any experience</option>
        {EXPERIENCE.map((e) => (
          <option key={e} value={e}>
            {e}
          </option>
        ))}
      </select>

      <span className="hidden h-6 w-px bg-slate-200 sm:block" aria-hidden="true" />

      <div className="relative sm:w-52">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <select
          value={location}
          onChange={(e) => onLocation(e.target.value)}
          aria-label="Location"
          className="h-11 w-full rounded-xl border-0 bg-transparent pl-9 pr-3 text-sm text-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
        >
          <option value="">Anywhere</option>
          {locations.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" size="lg" className="sm:ml-2">
        Search
      </Button>
    </form>
  );
}
