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
