'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Lock } from 'lucide-react';
import { HOMEPAGE_FEATURED_TRACKS } from '@/lib/demo-data-extra';
import { listCompanies, type ApiCompany } from '@/lib/api/catalog';

/**
 * Homepage featured tracks. The card shows the logo, name, blurb and a CTA — no inventory
 * counts (removed; see the note by the CTA). `GET /companies` is still read for two things:
 * the live logo, and the unlock signal — a `locked` track whose catalog row is published
 * flips to a normal "Prepare now" card automatically.
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

              {/* The raw question / PYQ / coding / rounds counts were removed from these
                  cards: leading with an inventory tally is the framing PR #29 took off the
                  student side, and the founder didn't want it on the marketing cards either.
                  The card now leads with what the track IS, then the CTA. */}
              {locked ? (
                <div className="mt-4 flex flex-1 items-end text-xs font-semibold text-[var(--color-text-muted)]">
                  Hub coming soon
                </div>
              ) : (
                <div className="mt-4 flex flex-1 items-end gap-1 text-xs font-semibold text-[var(--color-brand)] transition-colors group-hover:text-[var(--color-brand-strong)]">
                  Prepare now <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              )}
            </div>
          </CardShell>
        );
      })}
    </div>
  );
}
