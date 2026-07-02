import { apiClient } from './client';
import type { BroadcastResultDto, CreateBroadcastDto } from '@/shared/dto/broadcast.dto';

/**
 * Broadcast API client (Phase 3). Wraps `POST /api/v1/admin/broadcasts`, gated
 * server-side by @Roles(ADMIN, SUPER_ADMIN) + @RequireCapability('canBroadcast').
 */
export async function sendBroadcast(dto: CreateBroadcastDto): Promise<BroadcastResultDto> {
  const res = await apiClient.post<BroadcastResultDto>('/api/v1/admin/broadcasts', dto);
  return res.data;
}
