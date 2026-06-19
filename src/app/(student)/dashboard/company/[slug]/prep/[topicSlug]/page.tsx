import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { PracticeSession } from '@/components/practice/PracticeSession';
import { getCompany } from '@/lib/api/catalog';

/**
 * Company + topic practice — drills a single topic within a company's question
 * bank using the real, server-graded practice engine.
 */
export const dynamic = 'force-dynamic';

function formatSlug(slug: string): string {
  return slug
    .replace(/^section-\d+-[a-z-]+--/, '')
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

export default async function CompanyTopicPracticePage({
  params,
}: {
  params: Promise<{ slug: string; topicSlug: string }>;
}) {
  const { slug, topicSlug } = await params;
  let company = null;
  try {
    company = await getCompany(slug);
  } catch {
    company = null;
  }
  if (!company) notFound();

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Company Hubs', href: '/dashboard/company' },
          { label: company.name, href: `/dashboard/company/${slug}` },
          { label: 'Prep', href: `/dashboard/company/${slug}/prep` },
          { label: formatSlug(topicSlug) },
        ]}
      />

      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          {company.name} practice
        </p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">
          {formatSlug(topicSlug)}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Server-graded, server-tracked — drawn from {company.name}&apos;s question bank.
        </p>
      </header>

      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white" />}
      >
        <PracticeSession topicSlug={topicSlug} companySlug={slug} limit={10} />
      </Suspense>
    </div>
  );
}
