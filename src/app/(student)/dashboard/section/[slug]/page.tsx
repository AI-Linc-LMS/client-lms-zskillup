import { notFound } from 'next/navigation';
import { SectionHub } from '@/components/sections/SectionHub';
import { listTopicsWithCounts } from '@/lib/api/catalog';
import { findSection } from '@/lib/sections/section-catalog';

/**
 * Sectional Hub page — the section analog of the company hub. Resolves the section
 * tree from the live topic taxonomy (server-side, plain data — no icons across the
 * RSC boundary) and hands it to the client `SectionHub`. 404s on an unknown/empty
 * section slug.
 */
export const dynamic = 'force-dynamic';

export default async function SectionHubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let section = null;
  try {
    section = findSection(await listTopicsWithCounts(), slug);
  } catch {
    section = null;
  }
  if (!section) notFound();

  return <SectionHub section={section} />;
}
