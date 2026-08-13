'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api/base';

type SeoRow = { key: string; title: string | null };

/**
 * The document title present on first client evaluation — the SSR default from
 * the root layout. Restored when a route has no configured SEO title, so a stale
 * title never carries over from a previously-matched route.
 */
const DEFAULT_TITLE = typeof document !== 'undefined' ? document.title : '';

/** Fetched once per session and shared across every mount. */
let cache: Promise<SeoRow[]> | null = null;

function loadSeo(): Promise<SeoRow[]> {
  if (!cache) {
    cache = fetch(`${API_BASE_URL}/api/v1/seo`, { cache: 'force-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { data?: SeoRow[] } | SeoRow[] | null) =>
        (Array.isArray(j) ? j : j?.data) ?? [],
      )
      .catch(() => []);
  }
  return cache;
}

/** Longest catalog key that equals, or is a path-prefix of, the current route. */
function matchKey(rows: SeoRow[], path: string): SeoRow | undefined {
  let best: SeoRow | undefined;
  for (const r of rows) {
    if (r.key === path || path.startsWith(`${r.key}/`)) {
      if (!best || r.key.length > best.key.length) best = r;
    }
  }
  return best;
}

/**
 * Applies the admin-configured SEO title (from the SEO module) as the browser-tab
 * title on authenticated pages. Those pages are client components and cannot use
 * Next's `generateMetadata`, so the title is set imperatively here. Renders
 * nothing; mount once inside each authenticated app shell. Fails soft — if the
 * SEO fetch fails or no key matches, the page keeps its default title.
 */
export function SeoTitle() {
  const pathname = usePathname();
  useEffect(() => {
    let active = true;
    void loadSeo().then((rows) => {
      if (!active) return;
      const match = matchKey(rows, pathname);
      if (match?.title) document.title = match.title;
      else if (DEFAULT_TITLE) document.title = DEFAULT_TITLE;
    });
    return () => {
      active = false;
    };
  }, [pathname]);
  return null;
}
