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
