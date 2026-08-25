import { apiClient } from './client';
import type { CalendarEventDto } from '@/shared/dto/calendar.dto';

export type { CalendarEventDto } from '@/shared/dto/calendar.dto';

/** Everything with a date on it, for me, between two dates. */
export async function getMyCalendar(from?: string, to?: string): Promise<CalendarEventDto[]> {
  const p = new URLSearchParams();
  if (from) p.set('from', from);
  if (to) p.set('to', to);
  const q = p.toString();
  return (await apiClient.get<CalendarEventDto[]>(`/api/v1/me/calendar${q ? `?${q}` : ''}`)).data;
}
