import { PublicCertificateView } from '@/components/certificates/PublicCertificateView';

export const metadata = {
  title: 'Certificate · ZSkillup',
  description: 'A verified ZSkillup achievement certificate.',
};

export default async function PublicCertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PublicCertificateView id={id} />;
}
