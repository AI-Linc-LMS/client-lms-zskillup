import type { Metadata } from 'next';
import { getPublicSeo } from '@/lib/api/seo';
import {
  fillSeoContent,
  normaliseSeoContent,
  type SeoPageContent,
} from '@/shared/seo-content';

/**
 * Build a Next.js Metadata object for a public route from the admin-edited SEO
 * overrides, falling back to the provided defaults. Use inside a page's
 * `generateMetadata()`. Fails soft to the defaults if there is no override.
 */
export async function seoMetadataFor(
  key: string | string[],
  fallback: { title: string; description: string },
): Promise<Metadata> {
  const all = await getPublicSeo();
  // Several keys = most specific first. A page generated from a shared template passes
  // its EXACT path ahead of the template key, so adding /company/accenture/syllabus in
  // the admin overrides that one page while its eight siblings keep the template.
  const keys = Array.isArray(key) ? key : [key];
  const o = keys.map((k) => all.find((s) => s.key === k)).find((r) => r && (r.title || r.description));
  const title = o?.title || fallback.title;
  const description = o?.description || fallback.description;
  const keywords = o?.keywords
    ? o.keywords.split(',').map((k) => k.trim()).filter(Boolean)
    : undefined;
  const images = o?.ogImageUrl ? [o.ogImageUrl] : undefined;
  return {
    title,
    description,
    keywords,
    openGraph: { title, description, images },
    twitter: { card: 'summary_large_image', title, description, images },
  };
}

/**
 * Same as `seoMetadataFor`, for the pSEO hub families where ONE catalog row covers
 * every page in the family (`/company/[slug]`, `/section/[slug]`).
 *
 * The admin edits a template holding `{company}` / `{section}`; this substitutes the
 * real name per page. Nine company hubs today and a catalog that keeps growing — a
 * row per company would mean the newest hub ships with no metadata at all until
 * someone remembers to add one.
 *
 * Substitution runs over the override AND the fallback, so a template that an admin
 * saved without its token still produces one title per page rather than nine
 * identical ones.
 */
export async function seoTemplateMetadataFor(
  key: string | string[],
  vars: Record<string, string>,
  fallback: { title: string; description: string },
): Promise<Metadata> {
  const fill = (text: string) =>
    Object.entries(vars).reduce(
      (acc, [name, value]) => acc.split(`{${name}}`).join(value),
      text,
    );

  const base = await seoMetadataFor(key, fallback);
  const title = typeof base.title === 'string' ? fill(base.title) : base.title;
  const description = base.description ? fill(base.description) : undefined;
  const keywords = Array.isArray(base.keywords) ? base.keywords.map(fill) : base.keywords;
  const images = base.openGraph && 'images' in base.openGraph ? base.openGraph.images : undefined;

  return {
    ...base,
    title,
    description,
    keywords,
    openGraph: { ...base.openGraph, title: title as string, description, images },
    twitter: { card: 'summary_large_image', title: title as string, description, images },
  };
}

export interface SeoPageMedia {
  heroImageUrl: string | null;
  heroImageAlt: string | null;
  embedUrl: string | null;
  embedTitle: string | null;
}

const EMPTY_MEDIA: SeoPageMedia = {
  heroImageUrl: null,
  heroImageAlt: null,
  embedUrl: null,
  embedTitle: null,
};

/**
 * The image / video an admin attached to a page, most specific first.
 *
 * `keys` is tried in order, so a page passes its EXACT path before the template key it
 * shares with its siblings: `/company/accenture/syllabus` beats `/company/[slug]/syllabus`.
 * That is what makes one video per company possible on 81 pages generated from 9 rows —
 * the admin adds the exact path only for the pages that need their own.
 *
 * Fails soft to no media; getPublicSeo already returns [] on any error.
 */
export async function seoPageMedia(keys: string[]): Promise<SeoPageMedia> {
  const all = await getPublicSeo();
  for (const key of keys) {
    const row = all.find((s) => s.key === key);
    if (row && (row.heroImageUrl || row.embedUrl)) {
      return {
        heroImageUrl: row.heroImageUrl ?? null,
        heroImageAlt: row.heroImageAlt ?? null,
        embedUrl: row.embedUrl ?? null,
        embedTitle: row.embedTitle ?? null,
      };
    }
  }
  return EMPTY_MEDIA;
}

/**
 * The body copy an admin wrote for a page, most specific first, with template tokens
 * substituted — the content twin of `seoPageMedia`.
 *
 * `keys` is tried in order exactly as the metadata and media resolvers do, so a page
 * passes its EXACT path before the template key it shares with its siblings:
 * `/company/accenture/syllabus` beats `/company/[slug]/syllabus`. That is what lets one
 * row write all 9 companies' syllabus pages while a single company can still be given
 * its own words.
 *
 * `vars` fills `{company}` / `{year}` / `{section}` so a template row reads as real
 * copy on every page in the family rather than as nine identical paragraphs.
 *
 * Returns null when no key carries content, which is the state of most pages — the page
 * then renders exactly what it rendered before this feature existed.
 *
 * Normalises again here: `content_json` is jsonb, so the row may have been written by a
 * script, an older build, or a psql session. A malformed body must render as nothing,
 * never as a build-time crash on a prerendered page.
 */
export async function seoPageContent(
  keys: string[],
  vars: Record<string, string> = {},
): Promise<SeoPageContent | null> {
  const all = await getPublicSeo();
  for (const key of keys) {
    const row = all.find((s) => s.key === key);
    const content = normaliseSeoContent(row?.content);
    if (content) return Object.keys(vars).length ? fillSeoContent(content, vars) : content;
  }
  return null;
}
