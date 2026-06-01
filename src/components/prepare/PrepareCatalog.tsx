'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Sparkles, Star, Users, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PREP_TRACKS, PREP_TRACK_TABS, type PrepTrack } from '@/lib/demo-data';

const RECRUITERS = ['TCS', 'Infosys', 'Wipro', 'Cognizant', 'Capgemini', 'Accenture', 'Amazon'];
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];
const TYPES = ['Self-paced course', 'Mock drive', 'Live cohort', 'Drill set'];

const HERO_STATS = [
  { label: 'Students enrolled', value: '240,000+' },
  { label: 'Partner colleges', value: '1,200+' },
  { label: 'Average rating', value: '4.7★' },
  { label: 'Placement success', value: '82%' },
];

const RECRUITER_CHIPS = ['TCS', 'Infosys', 'Wipro', 'Cognizant', 'Capgemini', 'Accenture', '+24 more'];

export function PrepareHero() {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-navy p-8 text-white shadow-sm sm:p-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_100%_0%,rgba(243,112,33,0.18),transparent),radial-gradient(50%_50%_at_0%_100%,rgba(56,189,248,0.12),transparent)]"
      />
      <div className="relative">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">
          Catalog · Career preparation · Campus placement tracks
        </p>
        <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-[42px]">
          Land your first tech job with
          <br />
          <span className="text-orange">India&apos;s top recruiters.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/70">
          Structured preparation for TCS, Infosys, Wipro, Cognizant, Capgemini and Accenture. Real
          previous-year questions, live mock drives, expert instructors, and verified certificates
          accepted by 1,200+ campus placement cells.
        </p>

        {/* Stats row */}
        <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {HERO_STATS.map((s) => (
            <div key={s.label}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
                {s.label}
              </p>
              <p className="mt-1 text-2xl font-extrabold sm:text-3xl">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Search row */}
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="What do you want to learn? E.g. TCS NQT, Aptitude, DSA…"
              aria-label="Search tracks"
              className="h-12 w-full rounded-full border-0 bg-white pl-11 pr-32 text-sm text-navy placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40"
            />
            <button
              type="button"
              className="absolute right-1.5 top-1/2 inline-flex h-9 -translate-y-1/2 items-center rounded-full bg-navy px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Search
            </button>
          </div>
          <Link
            href="/dashboard/company/tcs"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-orange px-6 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-orange/90 active:translate-y-px"
          >
            <Sparkles className="size-4" aria-hidden="true" />
            Start with TCS NQT
          </Link>
        </div>

        {/* Alignment chips */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
            Aligned with hiring patterns of
          </span>
          {RECRUITER_CHIPS.map((r) => (
            <span
              key={r}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/85"
            >
              {r}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PrepareCatalog() {
  const [activeTab, setActiveTab] = useState(0);

  const visibleTracks = useMemo(() => {
    if (activeTab === 0) return PREP_TRACKS;
    const tab = PREP_TRACK_TABS[activeTab];
    return PREP_TRACKS.filter((t) => t.category === tab.label);
  }, [activeTab]);

  return (
    <div>
      {/* Tab strip */}
      <div
        className="-mx-1 mb-6 flex gap-1 overflow-x-auto border-b border-slate-200 px-1"
        role="tablist"
        aria-label="Track categories"
      >
        {PREP_TRACK_TABS.map((t, i) => {
          const active = activeTab === i;
          return (
            <button
              key={t.label}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(i)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 border-b-2 px-3 pb-3 pt-2 text-sm font-medium transition-colors',
                active
                  ? 'border-orange font-semibold text-navy'
                  : 'border-transparent text-slate-400 hover:text-slate-600',
              )}
            >
              {t.label}
              <span
                className={cn(
                  'rounded-full px-1.5 py-px text-[10px] font-bold',
                  active ? 'bg-orange text-white' : 'bg-slate-100 text-slate-500',
                )}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[15rem_1fr]">
        {/* Refine sidebar */}
        <aside className="hidden lg:block">
          <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-navy">Refine results</p>
            <FilterGroup title="Recruiter" options={RECRUITERS} />
            <FilterGroup title="Difficulty" options={DIFFICULTIES} />
            <FilterGroup title="Type" options={TYPES} />
          </div>
        </aside>

        {/* Results */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Showing <span className="font-semibold text-navy">{visibleTracks.length}</span> of {PREP_TRACKS.length} tracks
            </p>
            <label className="flex items-center gap-2 text-xs text-slate-500">
              Sort by
              <select className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30">
                <option>Best match</option>
                <option>Most enrolled</option>
                <option>Newest</option>
              </select>
            </label>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visibleTracks.map((t) => (
              <TrackCard key={t.code} track={t} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ title, options }: { title: string; options: string[] }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        {title}
      </p>
      <ul className="space-y-2">
        {options.map((o) => (
          <li key={o} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              id={`${title}-${o}`}
              className="size-3.5 rounded border-slate-300 text-orange focus:ring-orange/40"
            />
            <label htmlFor={`${title}-${o}`} className="cursor-pointer text-slate-600 hover:text-navy">
              {o}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TrackCard({ track }: { track: PrepTrack }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className={cn('relative flex h-32 items-center justify-center bg-gradient-to-br', track.accent)}>
        {track.badge ? (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy shadow-sm">
            {track.badge}
          </span>
        ) : null}
        <span className="text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
          {track.code}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{track.org}</p>
        <p className="mt-1 text-sm font-bold leading-snug text-navy">{track.title}</p>
        <p className="mt-1 text-xs text-slate-500">Priya Menon, Karthik N · 3 instructors</p>
        <div className="mt-auto flex items-center justify-between pt-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden="true" />
            <span className="font-semibold text-navy">4.8</span>
          </span>
          <span className="flex items-center gap-1">
            <Users className="size-3" aria-hidden="true" /> 52,400
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3" aria-hidden="true" /> 24h
          </span>
          <Link
            href="/dashboard/company"
            className="inline-flex items-center gap-1 font-semibold text-navy transition-colors hover:text-orange"
          >
            View →
          </Link>
        </div>
      </div>
    </article>
  );
}
