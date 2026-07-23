import { apiClient } from './client';

/** One video from the shared Vimeo account (admin picker). Mirrors the BE shape. */
export interface VimeoCatalogVideo {
  vimeoId: string;
  title: string;
  description: string | null;
  durationSeconds: number;
  thumbnailUrl: string | null;
  /** Paste-into-field value (carries the privacy hash for unlisted videos). */
  link: string;
  /** Ready player URL for a preview. */
  embedUrl: string | null;
}

/** Search the shared Vimeo library. `configured` is false when no token is set on
 *  the backend — the UI then falls back to paste-a-link. */
export async function searchVimeoCatalog(
  q: string,
  limit = 24,
): Promise<{ configured: boolean; videos: VimeoCatalogVideo[] }> {
  const params = new URLSearchParams();
  if (q.trim()) params.set('q', q.trim());
  params.set('limit', String(limit));
  const res = await apiClient.get<{ configured: boolean; videos: VimeoCatalogVideo[] }>(
    `/api/v1/admin/vimeo/videos?${params.toString()}`,
  );
  return res.data;
}
