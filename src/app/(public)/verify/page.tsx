import { CertificateVerifyForm } from '@/components/certificates/CertificateVerifyForm';
import { seoMetadataFor } from '@/lib/seo/page-metadata';

export function generateMetadata() {
  return seoMetadataFor('/verify', {
    title: 'Verify a Certificate · ZSkillup',
    description: 'Confirm the authenticity of any ZSkillup achievement certificate by its ID.',
  });
}

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  return <CertificateVerifyForm initialId={id ?? ''} />;
}
