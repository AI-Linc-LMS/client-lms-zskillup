import type { MetadataRoute } from 'next';
import { getPublicBlogs, getPublicJobs } from '@/lib/server/public-content';

/**
 * The public map of the site.
 *
 * Everything here must be readable WITHOUT a session - a crawler has none, and a page
 * that redirects to /login is worse than absent from a sitemap. That is the whole
 * selection rule: the workspace (`/dashboard`, `/practice`, …) is deliberately out.
 *
 * Jobs and blog posts are pulled live so a role published this morning is findable
 * this afternoon. Both fetchers already revalidate every 5 minutes and return [] on
 * failure, so a backend blip yields a smaller sitemap rather than a 500.
 */
export const revalidate = 300;

const SITE = 'https://prephasz.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [jobs, blogs] = await Promise.all([getPublicJobs(), getPublicBlogs()]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE}/jobs`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE}/blog`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE}/roadmap`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE}/login`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE}/signup`, changeFrequency: 'yearly', priority: 0.4 },
  ];

  return [
    ...staticRoutes,
    ...jobs.map((j) => ({
      url: `${SITE}/jobs/${j.slug}`,
      lastModified: new Date(j.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...blogs.map((b) => ({
      url: `${SITE}/blog/${b.slug}`,
      lastModified: b.publishedAt ? new Date(b.publishedAt) : undefined,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ];
}
