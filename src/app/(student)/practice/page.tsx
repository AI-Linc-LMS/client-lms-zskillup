import { Suspense } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { PracticeSession } from '@/components/practice/PracticeSession';

interface PageProps {
  searchParams: Promise<{ topic?: string; company?: string }>;
}

/**
 * Practice page — drill a topic or a company's question feed (Sprint 3).
 *
 *   /practice?topic=percentages          → 10 random percentage questions
 *   /practice?company=tcs                → 10 random TCS-flavoured questions
 *   /practice?topic=percentages&company=tcs → intersection
 *
 * The page itself is a Server Component. The interactive question UI is a
 * client leaf (`PracticeSession`).
 */
export default async function PracticePage({ searchParams }: PageProps) {
  const { topic, company } = await searchParams;
  const headline = topic
    ? `Practice · ${formatSlug(topic)}`
    : company
      ? `Practice · ${company.toUpperCase()}`
      : 'Practice';

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Practice' },
        ]}
      />

      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Topic mastery
        </p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">{headline}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Server-graded, server-tracked. Accuracy and weak-topic signal update as you go.
        </p>
      </header>

      <Suspense
        fallback={
          <div className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white" />
        }
      >
        <PracticeSession topicSlug={topic} companySlug={company} limit={10} />
      </Suspense>
    </div>
  );
}

function formatSlug(slug: string): string {
  return slug
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}
