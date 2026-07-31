import { apiClient } from './client';

export interface SeoMetadata {
  key: string;
  /** Friendly page name for the admin list (e.g. 'About'). */
  label?: string;
  /** Audience group for the admin list (e.g. 'Public', 'Student', 'Admin'). */
  section?: string;
  title: string | null;
  description: string | null;
  keywords: string | null;
  ogImageUrl: string | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * PUBLIC read of all SEO overrides — safe to call from server components
 * (generateMetadata). No auth; ISR-cached for 5 min so admin edits propagate
 * without a rebuild. Fails soft (returns []) so a page never breaks over SEO.
 */
export async function getPublicSeo(): Promise<SeoMetadata[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/seo`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: SeoMetadata[] } | SeoMetadata[];
    return (Array.isArray(json) ? json : json.data) ?? [];
  } catch {
    return [];
  }
}

/** Admin list (authed). */
export async function listSeo(): Promise<SeoMetadata[]> {
  const res = await apiClient.get<SeoMetadata[]>('/api/v1/admin/seo');
  return res.data;
}

/** Admin upsert for one page (authed). */
export async function upsertSeo(dto: {
  key: string;
  title?: string | null;
  description?: string | null;
  keywords?: string | null;
  ogImageUrl?: string | null;
}): Promise<SeoMetadata> {
  const res = await apiClient.put<SeoMetadata>('/api/v1/admin/seo', dto);
  return res.data;
}
