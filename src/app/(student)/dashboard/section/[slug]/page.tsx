import { notFound } from 'next/navigation';
import { SectionHub } from '@/components/sections/SectionHub';
import { CodingSectionLoader } from '@/components/sections/CodingSectionLoader';
import { listTopicsWithCounts } from '@/lib/api/catalog';
import {
  buildSoftSkillsSection,
  CODING_SECTION_SLUG,
  findSection,
  SOFT_SKILLS_ROOT,
  type SectionRoot,
} from '@/lib/sections/section-catalog';

/**
 * Sectional Hub page - the section analog of the company hub. Resolves the section
 * tree from the live topic taxonomy (server-side, plain data - no icons across the
 * RSC boundary) and hands it to the client `SectionHub`. Coding is a synthetic
 * section (its topics are fetched client-side by SectionHub, since the coding-topic
 * endpoint is auth-gated); Soft Skills maps to the interview-prep root. 404s on an
 * unknown section slug.
 */
export const dynamic = 'force-dynamic';

export default async function SectionHubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Coding is a synthetic section whose topics come from an auth-gated endpoint -
  // fetch + build it client-side.
  if (slug === CODING_SECTION_SLUG) return <CodingSectionLoader />;

  let section: SectionRoot | null = null;
  try {
    const topics = await listTopicsWithCounts();
    section = slug === SOFT_SKILLS_ROOT ? buildSoftSkillsSection(topics) : findSection(topics, slug);
  } catch {
    section = null;
  }
  if (!section) notFound();

  return <SectionHub section={section} />;
}
