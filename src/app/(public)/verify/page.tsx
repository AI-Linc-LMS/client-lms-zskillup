import { CertificateVerifyForm } from '@/components/certificates/CertificateVerifyForm';

export const metadata = {
  title: 'Verify a Certificate · ZSkillup',
  description: 'Confirm the authenticity of any ZSkillup achievement certificate by its ID.',
};

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  return <CertificateVerifyForm initialId={id ?? ''} />;
}
