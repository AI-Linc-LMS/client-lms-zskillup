import { apiClient } from './client';

/**
 * Admin config for the one-time calibration (Placement Readiness Test): the
 * platform-wide gate switch + which scheduled assessment IS the calibration.
 * Mirrors backend src/shared/dto/calibration-admin.dto.ts.
 */
export interface CalibrationAssessmentOption {
  id: string;
  title: string;
  isActive: boolean;
  isCalibration: boolean;
  scheduledAt?: string;
}

export interface CalibrationAdminSettings {
  /** Effective on/off for the calibration gate. */
  enabled: boolean;
  /** Where `enabled` came from: an admin DB override or the env default. */
  source: 'db' | 'env';
  /** The CALIBRATION_ENABLED env default (the fallback when no DB override). */
  envDefault: boolean;
  /** The scheduled assessment currently flagged as THE calibration (null = none). */
  calibrationAssessmentId: string | null;
  /** Active scheduled assessments to choose from. */
  assessments: CalibrationAssessmentOption[];
}

export interface UpdateCalibrationSettingsPayload {
  /** Flip the platform-wide gate. Omit to leave unchanged. */
  enabled?: boolean;
  /** Designate THE calibration assessment; null clears it. Omit to leave unchanged. */
  calibrationAssessmentId?: string | null;
}

export async function getCalibrationSettings(): Promise<CalibrationAdminSettings> {
  const res = await apiClient.get<CalibrationAdminSettings>('/api/v1/admin/calibration/settings');
  return res.data;
}

export async function updateCalibrationSettings(
  payload: UpdateCalibrationSettingsPayload,
): Promise<CalibrationAdminSettings> {
  const res = await apiClient.patch<CalibrationAdminSettings>(
    '/api/v1/admin/calibration/settings',
    payload,
  );
  return res.data;
}
