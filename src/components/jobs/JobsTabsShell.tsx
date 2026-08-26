'use client';

import { useSearchParams } from 'next/navigation';
import { JobsWorkspace } from './JobsWorkspace';

/**
 * Reads the optional ?tab= so /applications can redirect here and land on the right
 * view, and so a link to "my applications" is shareable.
 */
export function JobsTabsShell() {
  const params = useSearchParams();
  const tab = params.get('tab');
  const initial = tab === 'applied' || tab === 'saved' ? tab : 'browse';
  return <JobsWorkspace initialTab={initial} />;
}
