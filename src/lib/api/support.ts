import { apiClient } from './client';
import type {
  CreateTicketDto,
  CreateTicketMessageDto,
  TicketDetailDto,
  TicketDto,
  UpdateTicketDto,
} from '@/shared/dto/support.dto';

/** Support tickets API client (Phase 6). User routes under /support; staff under /admin/support. */

// ── User ─────────────────────────────────────────────────────────────────────
export async function createTicket(dto: CreateTicketDto): Promise<TicketDetailDto> {
  return (await apiClient.post<TicketDetailDto>('/api/v1/support/tickets', dto)).data;
}
export async function listMyTickets(): Promise<TicketDto[]> {
  return (await apiClient.get<TicketDto[]>('/api/v1/support/tickets')).data;
}
export async function getMyTicket(id: string): Promise<TicketDetailDto> {
  return (await apiClient.get<TicketDetailDto>(`/api/v1/support/tickets/${id}`)).data;
}
export async function replyToTicket(id: string, dto: CreateTicketMessageDto): Promise<TicketDetailDto> {
  return (await apiClient.post<TicketDetailDto>(`/api/v1/support/tickets/${id}/messages`, dto)).data;
}

// ── Staff ────────────────────────────────────────────────────────────────────
export async function listAllTickets(status?: string): Promise<TicketDto[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return (await apiClient.get<TicketDto[]>(`/api/v1/admin/support/tickets${qs}`)).data;
}
export async function getAdminTicket(id: string): Promise<TicketDetailDto> {
  return (await apiClient.get<TicketDetailDto>(`/api/v1/admin/support/tickets/${id}`)).data;
}
export async function replyToTicketAsStaff(
  id: string,
  dto: CreateTicketMessageDto,
): Promise<TicketDetailDto> {
  return (await apiClient.post<TicketDetailDto>(`/api/v1/admin/support/tickets/${id}/messages`, dto))
    .data;
}
export async function updateTicket(id: string, dto: UpdateTicketDto): Promise<TicketDetailDto> {
  return (await apiClient.patch<TicketDetailDto>(`/api/v1/admin/support/tickets/${id}`, dto)).data;
}
