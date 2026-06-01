import { notFound } from 'next/navigation';
import { CompanyHub } from '@/components/company/CompanyHub';
import { DEMO_COMPANIES } from '@/lib/demo-data';
import { getHubContent } from '@/lib/hub-data';

export function generateStaticParams() {
  return DEMO_COMPANIES.map((c) => ({ slug: c.slug }));
}

export default async function CompanyHubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!DEMO_COMPANIES.some((c) => c.slug === slug)) {
    notFound();
  }
  return <CompanyHub content={getHubContent(slug)} />;
}
