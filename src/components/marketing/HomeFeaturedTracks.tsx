'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ClipboardList, Code2, History, Lock } from 'lucide-react';
import { HOMEPAGE_FEATURED_TRACKS } from '@/lib/demo-data-extra';
import { listCompanies, type ApiCompany } from '@/lib/api/catalog';

/** Compact integer formatting: 1240 → "1.2k". */
function compact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k`;
  return String(n);
}

/**
 * Homepage featured tracks. The accent / blurb are curated presentation assets,
 * but the LOGO and ALL metrics (questions, PYQs, coding problems, rounds) now
 * come live from GET /companies — real bank counts, no fabricated numbers. Falls
 * back to the curated logo until the live catalog resolves.
 */
export function HomeFeaturedTracks() {
  const [live, setLive] = useState<Map<string, ApiCompany> | null>(null);

  useEffect(() => {
    let cancelled = false;
    listCompanies()
      .then((rows) => {
        if (!cancelled) setLive(new Map(rows.map((c) => [c.slug, c])));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // The single featured list (5 live + 4 coming-soon). A track auto-unlocks once its
  // catalog row is published — presence in `live` is the unlock signal, so a locked entry
  // whose hub goes live starts rendering as a normal track with no code change here.
  const tracks = HOMEPAGE_FEATURED_TRACKS;

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {tracks.map((t) => {
        const co = live?.get(t.slug);
        const logoSrc = co?.logoUrl ?? t.logoSrc;
        const rounds = co?.rounds ?? t.rounds;
        // Locked unless the catalog says otherwise. A published row (co present) always
        // wins, so a real hub can never be hidden behind a stale `locked` flag.
        const locked = !!t.locked && !co;

        const CardShell = locked
          ? ({ children, className }: { children: React.ReactNode; className: string }) => (
              <div className={className} aria-label={`${t.company} — coming soon`}>
                {children}
              </div>
            )
          : ({ children, className }: { children: React.ReactNode; className: string }) => (
              <Link href={`/dashboard/company/${t.slug}`} className={className}>
                {children}
              </Link>
            );

        return (
          <CardShell
            key={t.slug}
            className={`group flex flex-col overflow-hidden rounded-[var(--radius-card-lg)] border border-[var(--color-line)] bg-white shadow-[var(--shadow-card)] ${
              locked ? 'opacity-70' : 'hover-lift'
            }`}
          >
            <div className="relative flex h-36 items-center justify-center border-b border-[var(--color-line)] bg-white px-8 py-6">
              <span
                aria-hidden
                className={`absolute inset-x-0 top-0 h-[3px] rounded-t-[var(--radius-card-lg)] bg-gradient-to-r ${t.accent}`}
              />
              {locked ? (
                <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-2)] px-2.5 py-1 text-[10px] font-bold text-[var(--color-text-muted)] ring-1 ring-[var(--color-line)]">
                  <Lock className="h-2.5 w-2.5" /> Coming soon
                </span>
              ) : (
                t.badge && (
                  <span className="absolute left-4 top-4 inline-flex items-center rounded-full bg-[var(--color-surface-2)] px-2.5 py-1 text-[10px] font-bold text-[var(--color-text)] ring-1 ring-[var(--color-line)]">
                    {t.badge}
                  </span>
                )
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoSrc} alt={t.logoAlt} className={`h-auto max-h-12 w-full object-contain ${locked ? 'grayscale' : ''}`} />
            </div>

            <div className="flex flex-1 flex-col p-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-subtle)]">
                {t.company}
              </p>
              <p className="mt-1 font-bold leading-snug text-[var(--color-text)]">{t.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-text-muted)]">
                {t.description}
              </p>

              {locked ? (
                <div className="mt-4 flex flex-1 items-end text-xs font-semibold text-[var(--color-text-muted)]">
                  Hub coming soon
                </div>
              ) : (
                <>
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--color-text-muted)]">
                    <span className="inline-flex items-center gap-1 font-medium">
                      {/* Live count when the catalog resolves; else the curated figure —
                          never a bare "0" when /companies is slow/unavailable. */}
                      <ClipboardList className="h-3 w-3" /> {co?.questionCount ? compact(co.questionCount) : t.mcqs}{' '}
                      questions
                    </span>
                    {co?.pyqCount ? (
                      <span className="inline-flex items-center gap-1 font-medium text-[var(--color-brand-strong)]">
                        <History className="h-3 w-3" /> {compact(co.pyqCount)} PYQs
                      </span>
                    ) : null}
                    {co?.codingCount ? (
                      <span className="inline-flex items-center gap-1">
                        <Code2 className="h-3 w-3" /> {compact(co.codingCount)} coding
                      </span>
                    ) : null}
                    {rounds ? <span>{rounds} rounds</span> : null}
                  </div>

                  <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[var(--color-brand)] transition-colors group-hover:text-[var(--color-brand-strong)]">
                    Prepare now <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </>
              )}
            </div>
          </CardShell>
        );
      })}
    </div>
  );
}
