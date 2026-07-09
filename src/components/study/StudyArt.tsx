'use client';

import { useState, type ReactNode } from 'react';

/**
 * An external illustration (Popsy — free, hotlinkable SVGs) with a resilient inline
 * fallback. If the asset fails to load (offline / blocked), the `fallback` inline
 * SVG renders instead, so the UI never shows a broken image.
 */
export function StudyArt({
  name,
  color = 'blue',
  alt = '',
  className,
  fallback,
}: {
  name: string;
  color?: 'blue' | 'amber';
  alt?: string;
  className?: string;
  fallback?: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback ?? null}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://illustrations.popsy.co/${color}/${name}.svg`}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
