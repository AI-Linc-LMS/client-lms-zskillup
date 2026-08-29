import { apiClient } from './client';

/**
 * Admin control for the platform-wide subscription paywall — the same admin-tunable
 * pattern as the calibration gate. Mirrors backend src/shared/dto/paywall-admin.dto.ts.
 */
export interface PaywallAdminSettings {
  /** Effective on/off for the subscription paywall. */
  enabled: boolean;
  /** Where `enabled` came from: an admin DB override or the env default. */
  source: 'db' | 'env';
  /** The PAYWALL_ENABLED env default (the fallback when no DB override). */
  envDefault: boolean;
}

export interface UpdatePaywallSettingsPayload {
  /** Flip the platform-wide paywall. Omit to leave unchanged. */
  enabled?: boolean;
}

export async function getPaywallSettings(): Promise<PaywallAdminSettings> {
  const res = await apiClient.get<PaywallAdminSettings>('/api/v1/admin/paywall/settings');
  return res.data;
}

export async function updatePaywallSettings(
  payload: UpdatePaywallSettingsPayload,
): Promise<PaywallAdminSettings> {
  const res = await apiClient.patch<PaywallAdminSettings>('/api/v1/admin/paywall/settings', payload);
  return res.data;
}
