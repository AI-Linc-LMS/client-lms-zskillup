import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { TpoDriveDetail } from '@/components/tpo/TpoDriveDetail';

export default async function TpoDrivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Placement cell', href: '/tpo/dashboard' },
          { label: 'Placement', href: '/tpo/placement' },
          { label: 'Drive' },
        ]}
      />
      <TpoDriveDetail driveId={id} />
    </div>
  );
}
