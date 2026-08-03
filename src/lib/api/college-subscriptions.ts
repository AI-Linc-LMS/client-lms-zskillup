import { apiClient } from './client';
import type {
  CollegeEntitlementSyncResultDto,
  CollegeSubscriptionScopeDto,
  UpdateCollegeSubscriptionScopeDto,
} from '@/shared/dto/subscription.dto';

/**
 * A college's subscription SCOPE - what its students actually inherit. Reading is
 * role-gated (ADMIN / SUPER_ADMIN); writing additionally needs the
 * `canManageSubscriptions` capability, so the card renders read-only for an admin
 * without it rather than failing on load.
 */

export type CollegeSubscriptionScope = CollegeSubscriptionScopeDto;
export type CollegeEntitlementSyncResult = CollegeEntitlementSyncResultDto;

export async function getCollegeSubscriptionScope(
  collegeId: string,
): Promise<CollegeSubscriptionScope> {
  const res = await apiClient.get<CollegeSubscriptionScope>(
    `/api/v1/admin/colleges/${collegeId}/subscription-scope`,
  );
  return res.data;
}

export async function updateCollegeSubscriptionScope(
  collegeId: string,
  body: UpdateCollegeSubscriptionScopeDto,
): Promise<{ scope: CollegeSubscriptionScope; result: CollegeEntitlementSyncResult }> {
  const res = await apiClient.put<{
    scope: CollegeSubscriptionScope;
    result: CollegeEntitlementSyncResult;
  }>(`/api/v1/admin/colleges/${collegeId}/subscription-scope`, body);
  return res.data;
}
