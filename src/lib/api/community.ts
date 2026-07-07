import { apiClient } from './client';
import type {
  CommunityCommentDto,
  CommunityLikeToggleDto,
  CommunityPostDetailDto,
  CommunityPostDto,
  CommunityPostListDto,
  CommunityStatsDto,
  CreateCommunityCommentDto,
  CreateCommunityPostDto,
  UpdateCommunityPostDto,
} from '@/shared/dto/community.dto';

export type {
  CommunityAuthorDto,
  CommunityCommentDto,
  CommunityPostDetailDto,
  CommunityPostDto,
  CommunityStatsDto,
} from '@/shared/dto/community.dto';
export { CommunityPostType } from '@/shared/enums';

/** Community / discussion forum API client. Every route requires a signed-in user. */

export interface ListPostsParams {
  type?: string;
  tag?: string;
  search?: string;
  sort?: 'recent' | 'top';
  limit?: number;
  offset?: number;
}

export async function listCommunityPosts(params: ListPostsParams = {}): Promise<CommunityPostListDto> {
  const qs = new URLSearchParams();
  if (params.type) qs.set('type', params.type);
  if (params.tag) qs.set('tag', params.tag);
  if (params.search) qs.set('search', params.search);
  if (params.sort) qs.set('sort', params.sort);
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.offset != null) qs.set('offset', String(params.offset));
  const q = qs.toString();
  return (await apiClient.get<CommunityPostListDto>(`/api/v1/community/posts${q ? `?${q}` : ''}`)).data;
}

export async function getCommunityPost(id: string): Promise<CommunityPostDetailDto> {
  return (await apiClient.get<CommunityPostDetailDto>(`/api/v1/community/posts/${id}`)).data;
}

export async function createCommunityPost(body: CreateCommunityPostDto): Promise<CommunityPostDto> {
  return (await apiClient.post<CommunityPostDto>('/api/v1/community/posts', body)).data;
}

export async function updateCommunityPost(
  id: string,
  body: UpdateCommunityPostDto,
): Promise<CommunityPostDto> {
  return (await apiClient.patch<CommunityPostDto>(`/api/v1/community/posts/${id}`, body)).data;
}

export async function deleteCommunityPost(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/community/posts/${id}`);
}

export async function likeCommunityPost(id: string): Promise<CommunityLikeToggleDto> {
  return (await apiClient.post<CommunityLikeToggleDto>(`/api/v1/community/posts/${id}/like`, {})).data;
}

export async function pinCommunityPost(id: string, pinned: boolean): Promise<CommunityPostDto> {
  return (await apiClient.post<CommunityPostDto>(`/api/v1/community/posts/${id}/pin`, { pinned })).data;
}

export async function addCommunityComment(
  postId: string,
  body: CreateCommunityCommentDto,
): Promise<CommunityCommentDto> {
  return (await apiClient.post<CommunityCommentDto>(`/api/v1/community/posts/${postId}/comments`, body))
    .data;
}

export async function deleteCommunityComment(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/community/comments/${id}`);
}

export async function likeCommunityComment(id: string): Promise<CommunityLikeToggleDto> {
  return (await apiClient.post<CommunityLikeToggleDto>(`/api/v1/community/comments/${id}/like`, {})).data;
}

export async function getCommunityStats(): Promise<CommunityStatsDto> {
  return (await apiClient.get<CommunityStatsDto>('/api/v1/community/stats')).data;
}
