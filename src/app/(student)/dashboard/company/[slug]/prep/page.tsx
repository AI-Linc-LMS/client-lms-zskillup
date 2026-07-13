import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { CompanyPrepPanel } from '@/components/company/CompanyPrepPanel';
import { getCompany } from '@/lib/api/catalog';

/**
 * Standalone prep workspace for a company — the full-page version of the hub's
 * Practice tab: year-wise previous-year papers, target roles, and all topics
 * with live counts. Everything is dynamic (GET /companies/:slug/prep) and links
 * into the real practice engine.
 */
export const dynamic = 'force-dynamic';

export default async function CompanyPrepPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
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
          { label: 'Prep' },
        ]}
      />

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Practice workspace
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-navy sm:text-[28px]">
            {company.name} - Prep
          </h1>
        </div>
        <Link
          href={`/dashboard/company/${slug}`}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-slate-600 hover:text-navy"
        >
          <ChevronLeft className="size-4" /> Back to hub
        </Link>
      </div>

      <CompanyPrepPanel companySlug={slug} companyName={company.name} />
    </div>
  );
}
