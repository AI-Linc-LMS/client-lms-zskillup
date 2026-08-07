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

/** A Vimeo folder ("project") for the picker's folder filter. */
export interface VimeoFolder {
  id: string;
  name: string;
  videoCount: number;
}

/** Search the shared Vimeo library — or a single folder when `folder` is set.
 *  `configured` is false when no token is set on the backend (UI falls back to paste). */
export async function searchVimeoCatalog(
  q: string,
  limit = 24,
  folder?: string | null,
): Promise<{ configured: boolean; videos: VimeoCatalogVideo[] }> {
  const params = new URLSearchParams();
  if (q.trim()) params.set('q', q.trim());
  params.set('limit', String(limit));
  if (folder) params.set('folder', folder);
  const res = await apiClient.get<{ configured: boolean; videos: VimeoCatalogVideo[] }>(
    `/api/v1/admin/vimeo/videos?${params.toString()}`,
  );
  return res.data;
}

/** List the shared Vimeo account's folders for the picker filter. */
export async function listVimeoFolders(): Promise<{ configured: boolean; folders: VimeoFolder[] }> {
  const res = await apiClient.get<{ configured: boolean; folders: VimeoFolder[] }>(
    '/api/v1/admin/vimeo/folders',
  );
  return res.data;
}
