import { apiClient } from './client';

/** Mirrors backend src/shared/dto/feature-locks.dto.ts. */
export type FeatureLockModule =
  | 'mock'
  | 'practice'
  | 'coding'
  | 'company'
  | 'mock_interview'
  | 'resume'
  | 'study_material';

export interface ModuleLock {
  module: FeatureLockModule;
  /** Subscription lock — only bites while the master paywall is on. */
  subscription: boolean;
  /** Profile-completion lock — requires calibration, independent of the paywall. */
  profile: boolean;
}

export interface FeatureLocksSettings {
  /** The master paywall (kill switch): while off, every module's subscription lock is inert. */
  masterPaywallEnabled: boolean;
  masterPaywallSource: 'db' | 'env';
  modules: ModuleLock[];
}

export interface UpdateFeatureLockPayload {
  module: FeatureLockModule;
  subscription?: boolean;
  profile?: boolean;
}

export async function getFeatureLocks(): Promise<FeatureLocksSettings> {
  return (await apiClient.get<FeatureLocksSettings>('/api/v1/admin/feature-locks')).data;
}

export async function updateFeatureLock(
  payload: UpdateFeatureLockPayload,
): Promise<FeatureLocksSettings> {
  return (await apiClient.patch<FeatureLocksSettings>('/api/v1/admin/feature-locks', payload)).data;
}
