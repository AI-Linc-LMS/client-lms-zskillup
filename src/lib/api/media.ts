import { apiClient } from './client';
import {
  ALLOWED_IMAGE_CONTENT_TYPES,
  type AllowedImageContentType,
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
export async function uploadLiveSessionCover(file: File): Promise<string> {
  const contentType = assertImage(file);
  const { uploadUrl, publicUrl } = (
    await apiClient.post<PresignUploadResultDto>(
      '/api/v1/admin/media/live-session-cover/presign',
      { contentType },
    )
  ).data;
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });
  if (!res.ok) throw new Error('Upload to storage failed. Please try again.');
  return publicUrl;
}
