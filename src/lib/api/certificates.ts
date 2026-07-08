import { apiClient } from './client';
import type {
  CertificateVerifyDto,
  IssuedCertificateDto,
  MyCertificatesResponseDto,
} from '@/shared/dto/certificate.dto';

export type {
  MyCertificateDto,
  MyCertificatesResponseDto,
  IssuedCertificateDto,
  CertificateVerifyDto,
} from '@/shared/dto/certificate.dto';

/** All 7 certificate tiers with the student's unlock/issue state + total XP. */
export async function getMyCertificates(): Promise<MyCertificatesResponseDto> {
  return (await apiClient.get<MyCertificatesResponseDto>('/api/v1/me/certificates')).data;
}

/** Mint (or fetch) the certificate for a tier the student has unlocked. */
export async function issueCertificate(slug: string): Promise<IssuedCertificateDto> {
  return (await apiClient.post<IssuedCertificateDto>(`/api/v1/me/certificates/${slug}/issue`, {})).data;
}

/** Public verification of a certificate id (no auth) — share page + verify form. */
export async function verifyCertificate(certificateId: string): Promise<CertificateVerifyDto> {
  return (
    await apiClient.get<CertificateVerifyDto>(
      `/api/v1/certificates/${encodeURIComponent(certificateId)}/verify`,
    )
  ).data;
}
