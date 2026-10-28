import type { Metadata } from 'next';
import { getPublicSeo } from '@/lib/api/seo';

/**
 * Build a Next.js Metadata object for a public route from the admin-edited SEO
 * overrides, falling back to the provided defaults. Use inside a page's
 * `generateMetadata()`. Fails soft to the defaults if there is no override.
 */
export async function seoMetadataFor(
  key: string,
  fallback: { title: string; description: string },
): Promise<Metadata> {
  const all = await getPublicSeo();
  const o = all.find((s) => s.key === key);
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
  key: string,
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
