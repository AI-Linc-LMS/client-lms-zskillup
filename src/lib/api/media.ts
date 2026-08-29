import { apiClient } from './client';
import {
  ALLOWED_IMAGE_CONTENT_TYPES,
  type AllowedImageContentType,
  type MediaUploadPurpose,
  type PresignUploadResultDto,
} from '@/shared/dto/media.dto';

/** Cover images are small posters — keep uploads modest. */
export const MAX_COVER_BYTES = 5 * 1024 * 1024; // 5 MB

/** Validate a chosen file is an allowed image within the size cap. */
function assertImage(file: File): AllowedImageContentType {
  const t = file.type as AllowedImageContentType;
  if (!(ALLOWED_IMAGE_CONTENT_TYPES as readonly string[]).includes(t)) {
    throw new Error('Please choose a JPG, PNG or WebP image.');
  }
  if (file.size > MAX_COVER_BYTES) {
    throw new Error('That image is too large (max 5 MB).');
  }
  return t;
}

/**
 * Upload a live-session cover: ask the backend to presign a scoped S3 PUT URL,
 * upload the file straight to S3 from the browser, and return the permanent
 * public URL to store on the session. The raw PUT deliberately does NOT go
 * through apiClient (no auth cookies to S3) — it hits the presigned URL directly.
 */
export async function uploadAdminImage(file: File, purpose: MediaUploadPurpose): Promise<string> {
  const contentType = assertImage(file);
  const { uploadUrl, publicUrl } = (
    await apiClient.post<PresignUploadResultDto>('/api/v1/admin/media/presign', { contentType, purpose })
  ).data;
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });
  if (!res.ok) throw new Error('Upload to storage failed. Please try again.');
  return publicUrl;
}

/** Live-session cover (kept for existing callers). */
export function uploadLiveSessionCover(file: File): Promise<string> {
  return uploadAdminImage(file, 'live-session-cover');
}

/** Company logo on a job posting (admin). Same image rules as a cover. */
export function uploadCompanyLogo(file: File): Promise<string> {
  return uploadAdminImage(file, 'job-logo');
}

/** Max resume PDF size. Resumes are a few pages — keep it modest. */
export const MAX_RESUME_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Upload a candidate resume PDF from the apply form. Unlike the admin uploaders this
 * hits a STUDENT-callable presign (/me/media/resume-presign); the server fixes the
 * purpose so the file can only land in the resume prefix. Returns the stored URL + the
 * original filename to show the admin.
 */
export async function uploadResume(file: File): Promise<{ url: string; name: string }> {
  if (file.type !== 'application/pdf') {
    throw new Error('Please choose a PDF resume.');
  }
  if (file.size > MAX_RESUME_BYTES) {
    throw new Error('That resume is too large (max 5 MB).');
  }
  const { uploadUrl, publicUrl } = (
    await apiClient.post<PresignUploadResultDto>('/api/v1/me/media/resume-presign', {
      contentType: 'application/pdf',
      purpose: 'resume',
    })
  ).data;
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/pdf' },
    body: file,
  });
  if (!res.ok) throw new Error('Upload to storage failed. Please try again.');
  return { url: publicUrl, name: file.name };
}

/**
 * Upload a job description PDF.
 *
 * Same presign path as images, different content type. Deliberately NOT used for
 * candidate resumes: the only prefix the task role can write is publicly readable, and
 * a CV is not something to publish - applications reference the student's existing
 * ZSkillup resume instead.
 */
export async function uploadJobDescription(file: File): Promise<{ url: string; name: string }> {
  if (file.type !== 'application/pdf') {
    throw new Error('Job descriptions must be a PDF.');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('That file is over 10 MB. Please compress it first.');
  }
  const { uploadUrl, publicUrl } = (
    await apiClient.post<PresignUploadResultDto>('/api/v1/admin/media/presign', {
      contentType: 'application/pdf',
      purpose: 'job-jd',
    })
  ).data;
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/pdf' },
    body: file,
  });
  if (!res.ok) throw new Error('Upload to storage failed. Please try again.');
  return { url: publicUrl, name: file.name };
}
