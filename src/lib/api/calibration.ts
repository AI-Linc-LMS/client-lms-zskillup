import { apiClient } from './client';
import type { CalibrationStatusDto } from '@/shared/dto/calibration.dto';

export type { CalibrationStatusDto, CalibrationScoresDto } from '@/shared/dto/calibration.dto';

/** Module-scope dedup so the modal + gate + sidebar don't triple-fetch on a page
 *  mount; cleared on settle so the next mount (post-calibration) re-fetches. */
let inFlight: Promise<CalibrationStatusDto> | null = null;

/** Calibration status for the signed-in student (required / completed / mock id). */
export async function getMyCalibration(): Promise<CalibrationStatusDto> {
  if (inFlight) return inFlight;
  const p = apiClient.get<CalibrationStatusDto>('/api/v1/me/calibration').then((r) => r.data);
  inFlight = p;
  p.then(
    () => {
      inFlight = null;
    },
    () => {
      inFlight = null;
    },
  );
  return p;
}
