import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { TpoStudentPlacement } from '@/components/tpo/TpoStudentPlacement';

export default async function TpoStudentPlacementPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Placement cell', href: '/tpo/dashboard' },
          { label: 'Placement', href: '/tpo/placement' },
          { label: 'Student' },
        ]}
      />
      <TpoStudentPlacement userId={id} />
    </div>
  );
}
