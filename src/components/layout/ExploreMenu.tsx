'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ASSESSMENT_PLATFORMS, DEMO_COMPANIES, EXPLORE_TRACKS } from '@/lib/demo-data';

/**
 * Explore mega-menu (matches the demo screenshots): TRACKS · PLATFORMS ·
 * COMPANIES columns + a ZSkillup Plus card. Client leaf — only the dropdown is
 * interactive; the rest of the TopBar stays a Server Component.
 */
export function ExploreMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="hidden lg:block" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-sm font-medium text-foreground"
      >
        Explore
        <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-14 z-40 border-b border-slate-200 bg-white shadow-sm">
          <div className="mx-auto grid max-w-6xl grid-cols-12 gap-8 px-6 py-8">
            <div className="col-span-2">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Tracks
              </p>
              <ul className="space-y-2">
                {EXPLORE_TRACKS.map((t) => (
                  <li key={t.href}>
                    <Link href={t.href} className="text-sm text-foreground hover:text-orange">
                      {t.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="col-span-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Platforms
              </p>
              <div className="grid grid-cols-2 gap-2">
                {ASSESSMENT_PLATFORMS.map((p) => (
                  <div
                    key={p}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                  >
                    <span className="grid size-6 place-items-center rounded bg-muted text-[10px] font-semibold">
                      {p.slice(0, 2).toUpperCase()}
                    </span>
                    {p}
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Companies
              </p>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_COMPANIES.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/dashboard/company/${c.slug}`}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:border-orange"
                  >
                    <span className="grid size-6 place-items-center rounded bg-muted text-[10px] font-semibold">
                      {c.name.slice(0, 2).toUpperCase()}
                    </span>
                    {c.name}
                  </Link>
                ))}
              </div>
              <Link href="/dashboard/company" className="mt-3 inline-block text-sm font-medium text-orange hover:underline">
                All companies →
              </Link>
            </div>

            <div className="col-span-2">
              <div className="rounded-xl bg-gradient-to-b from-orange to-amber-500 p-4 text-white">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/80">
                  ZSkillup Plus
                </p>
                <p className="mt-2 text-sm">
                  Full company tracks, video walkthroughs, and adaptive mocks — practice like the real drive.
                </p>
                <Link
                  href="/prepare"
                  className="mt-4 inline-block rounded-md bg-white px-4 py-2 text-sm font-semibold text-orange"
                >
                  Get started
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
