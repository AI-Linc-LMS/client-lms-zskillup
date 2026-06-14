import { notFound } from 'next/navigation';
import { CompanyHub } from '@/components/company/CompanyHub';
import { DEMO_COMPANIES } from '@/lib/demo-data';
import { getHubContent, type HubContent } from '@/lib/hub-data';
import { getCompany } from '@/lib/api/catalog';

/**
 * Generate static params at build time from the seeded company list. We can't
 * call the auth-required API here, so we fall back to the demo company slugs
 * which mirror the seed. Pages are dynamically re-rendered if the slug exists.
 */
export function generateStaticParams() {
  return DEMO_COMPANIES.map((c) => ({ slug: c.slug }));
}

/**
 * Company hub page — Sprint 3 wires this to the real backend hub endpoint
 * (`GET /api/v1/companies/:slug`) with a graceful fallback to the demo content
 * so the page still renders if the backend is unreachable in preview.
 */
export default async function CompanyHubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Try the live backend (public endpoint, no auth required).
  let liveHub = null;
  try {
    liveHub = await getCompany(slug);
  } catch {
    // Network error or 404 → fall through to demo content
  }

  // If the slug isn't in either source, 404.
  if (!liveHub && !DEMO_COMPANIES.some((c) => c.slug === slug)) {
    notFound();
  }

  // Start from the demo hub content (which has the full 7-tab body), then
  // overlay the live company metadata when available. Only fields present on
  // the demo `company` shape are overlaid; description lives in `overview`.
  const demoContent = getHubContent(slug);
  const content: HubContent = liveHub
    ? {
        ...demoContent,
        company: {
          ...demoContent.company,
          name: liveHub.name,
          tagline: liveHub.tagline ?? demoContent.company.tagline,
          accent: liveHub.accent ?? demoContent.company.accent,
          badge: liveHub.badge ?? demoContent.company.badge,
        },
        overview: liveHub.description
          ? { ...demoContent.overview, summary: liveHub.description }
          : demoContent.overview,
      }
    : demoContent;

  return <CompanyHub content={content} />;
}
