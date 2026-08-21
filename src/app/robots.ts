import type { MetadataRoute } from 'next';

/**
 * Crawlers get the public surface and nothing else.
 *
 * The disallowed prefixes are the signed-in product. None of them serve data to an
 * anonymous request - middleware bounces them to /login and every API call is guarded
 * - so this is not a security control. It keeps login redirects out of search results
 * and stops crawl budget being spent on pages no visitor can read.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/superadmin',
        '/tpo',
        '/dashboard',
        '/applications',
        '/cart',
        '/checkout',
        '/api/',
      ],
    },
    sitemap: 'https://prephasz.com/sitemap.xml',
  };
}
