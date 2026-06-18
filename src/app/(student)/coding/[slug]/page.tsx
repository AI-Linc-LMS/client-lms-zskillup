import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { CodingWorkspace } from '@/components/coding/CodingWorkspace';

/**
 * Coding workspace for one problem. The problem (statement + sample cases +
 * starter code) is loaded client-side so the Monaco editor, run and graded
 * submit all share live state.
 */
export default async function CodingProblemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Coding', href: '/coding' },
          { label: 'Solve' },
        ]}
      />
      <CodingWorkspace slug={slug} />
    </div>
  );
}
