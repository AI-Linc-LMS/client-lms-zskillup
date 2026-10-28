import { apiClient } from './client';
import type { PromoPlacement } from '@/shared/promo-placements';

export interface PromoBannerDto {
  id: string;
  placement: PromoPlacement;
  title: string;
  body: string | null;
  imageUrl: string | null;
  alt: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  sortOrder: number;
  /** Derived server-side — whether it is on screen right now. */
  isLive?: boolean;
}

export type UpsertPromoBanner = Omit<PromoBannerDto, 'id' | 'isLive'>;

/** Admin list — every banner, including scheduled and switched-off. */
export async function listPromoBanners(): Promise<PromoBannerDto[]> {
  const res = await apiClient.get<PromoBannerDto[]>('/api/v1/admin/promo-banners');
  return res.data;
}

export async function createPromoBanner(dto: UpsertPromoBanner): Promise<PromoBannerDto> {
  const res = await apiClient.post<PromoBannerDto>('/api/v1/admin/promo-banners', dto);
  return res.data;
}

export async function updatePromoBanner(id: string, dto: UpsertPromoBanner): Promise<PromoBannerDto> {
  const res = await apiClient.put<PromoBannerDto>(`/api/v1/admin/promo-banners/${id}`, dto);
  return res.data;
}

export async function deletePromoBanner(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/admin/promo-banners/${id}`);
}
