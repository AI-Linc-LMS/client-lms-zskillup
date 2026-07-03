'use client';

import { useEffect, useState } from 'react';
import NumberFlow from '@number-flow/react';

/**
 * Odometer-style animated number (design-direction app-feel upgrade).
 * Mounts at 0 and rolls to `value`, then rolls smoothly on any later change.
 * Respects prefers-reduced-motion (NumberFlow default).
 */
export function AnimatedNumber({
  value,
  suffix,
  className,
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    setDisplay(value);
  }, [value]);
  return <NumberFlow value={display} suffix={suffix} locales="en-IN" className={className} />;
}
