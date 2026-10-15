'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * The drive's own sub-navigation (design law §4.12 — underline tabs, never pills).
 *
 * A drive now has seven working surfaces. They were linked to each other in prose at the
 * top of each page, which worked at three and stopped working at six: a reader had to
 * finish a sentence to discover that a Rounds screen existed at all. Tabs make the whole
 * set visible from any one of them, which is the only way somebody finds the screen they
 * did not know to look for.
 *
 * Order follows the drive's own life — set it up, see who fits, work the pipeline, run
 * the rounds, then read what happened.
 */
const TABS = [
  { seg: '', label: 'Overview' },
  { seg: 'candidates', label: 'Candidate fit' },
  { seg: 'applicants', label: 'Applicants' },
  { seg: 'search', label: 'Search' },
  { seg: 'rounds', label: 'Rounds' },
  { seg: 'practice', label: 'Practice' },
  { seg: 'report', label: 'Report' },
] as const;

export function DriveTabs({ driveId }: { driveId: string }) {
  const pathname = usePathname() ?? '';
  const base = `/admin/jobs/${driveId}`;
  const current = pathname.startsWith(base) ? pathname.slice(base.length).replace(/^\//, '') : '';

  return (
    <nav aria-label="Drive sections" className="border-b border-slate-200">
      <ul className="-mb-px flex flex-wrap gap-x-6">
        {TABS.map((t) => {
          const active = current === t.seg;
          return (
            <li key={t.seg || 'overview'}>
              <Link
                href={t.seg ? `${base}/${t.seg}` : base}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'block border-b-2 px-0.5 pb-2.5 pt-1 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-orange/40 focus-visible:ring-offset-2',
                  active
                    ? 'border-orange font-semibold text-navy'
                    : 'border-transparent text-slate-400 hover:text-slate-600',
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
