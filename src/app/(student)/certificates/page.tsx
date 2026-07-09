import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { CertificatesGallery } from '@/components/certificates/CertificatesGallery';

export const metadata = {
  title: 'Certificates · ZSkillup',
  description: 'Earn XP-based certificates, download them as PDFs, and share a public verifiable link.',
};

export default function CertificatesPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/dashboard' }, { label: 'Certificates' }]} />
      <CertificatesGallery />
    </div>
  );
}
