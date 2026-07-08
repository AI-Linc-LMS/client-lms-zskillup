'use client';

import { useEffect, useState } from 'react';
import { getMyCalibration, type CalibrationStatusDto } from '@/lib/api/calibration';

export interface CalibrationState extends CalibrationStatusDto {
  loading: boolean;
}

const IDLE: CalibrationStatusDto = {
  required: false,
  completed: false,
  enabled: false,
  mockTestId: null,
  scheduledAssessmentId: null,
  scores: null,
};

/**
 * Live calibration status for the signed-in student. Re-checks on window focus /
 * tab visibility so finishing the calibration in another tab unlocks this one on
 * return. Fails OPEN — on a fetch error (or for non-students / when the feature
 * flag is off) `required` stays false, so a transient blip never locks anyone out.
 */
export function useCalibrationStatus(): CalibrationState {
  const [state, setState] = useState<CalibrationState>({ loading: true, ...IDLE });

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      getMyCalibration()
        .then((d) => {
          if (!cancelled) setState({ loading: false, ...d });
        })
        .catch(() => {
          if (!cancelled) setState({ loading: false, ...IDLE });
        });
    };
    check();
    const onFocus = () => check();
    const onVis = () => document.visibilityState === 'visible' && check();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return state;
}
