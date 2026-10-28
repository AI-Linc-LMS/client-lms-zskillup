import { notFound } from 'next/navigation';
import { CompanyHub } from '@/components/company/CompanyHub';
import { getHubContent, type HubContent } from '@/lib/hub-data';
import { getCompany } from '@/lib/api/catalog';
import type { CompanyType, Difficulty } from '@/lib/demo-data';

/**
 * Company hub page - now fully backed by the live API. The company hero + card
 * metadata come from `catalog.companies`, and the 7-tab body from
 * `catalog.company_hub_content` (per-company, admin-editable). The templated
 * `getHubContent` is used only as a graceful fallback if a company has no hub
 * row authored yet, so the page never renders empty.
 */
export const dynamic = 'force-dynamic';

/**
 * POINT SEARCH ENGINES AT THE PUBLIC LANDING PAGE, NOT THIS ONE.
 *
 * This hub is publicly reachable — middleware exempts /dashboard/company so a logged-out
 * visitor following a marketing link is not bounced to /login. That makes it a second,
 * near-identical page about the same company as /company/[slug], and left alone a crawler
 * is free to rank whichever it likes. The app URL is the worse one to land on: it is the
 * product surface, it reads as an app screen, and it carries no sign-up CTA.
 *
 * Declaring the landing page canonical settles that without redirecting anyone — students
 * who are already here keep using this page exactly as before.
 *
 * Only `alternates` is set; everything else still inherits from the root layout.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { alternates: { canonical: `https://prephasz.com/company/${slug}` } };
}

function mapType(t: string): CompanyType {
  return t === 'PRODUCT' ? 'Product' : t === 'CONSULTING' ? 'Consulting' : 'Service';
}

export default async function CompanyHubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let live = null;
  try {
    live = await getCompany(slug);
  } catch {
    live = null;
  }
  if (!live) notFound();

  const fallback = getHubContent(slug);

  const company: HubContent['company'] = {
    slug: live.slug,
    name: live.name,
    tagline: live.tagline ?? fallback.company.tagline,
    type: mapType(live.type),
    difficulty: (live.difficulty as Difficulty | null) ?? fallback.company.difficulty,
    rating: live.rating ?? fallback.company.rating,
    enrolled: live.enrolled ?? fallback.company.enrolled,
    package: live.package ?? fallback.company.package,
    mcqs: live.mcqs ?? fallback.company.mcqs,
    questionCount: live.questionCount,
    rounds: live.rounds ?? fallback.company.rounds,
    badge: live.badge ?? fallback.company.badge,
    accent: live.accent ?? fallback.company.accent,
    logoUrl: live.logoUrl ?? fallback.company.logoUrl ?? null,
  };

  const h = live.hub;
  const content: HubContent = h
    ? {
        company,
        introEmbedUrl: h.introEmbedUrl ?? null,
        overviewVideos: live.overviewVideos ?? [],
        overview: h.overview,
        syllabus: h.syllabus,
        quickStats: h.quickStats,
        material: h.material,
        quizzes: h.quizzes,
        mocks: h.mocks,
        formulaSheets: h.formulaSheets,
        interviews: h.interviews,
      }
    : { ...fallback, company };

  return <CompanyHub content={content} />;
}
