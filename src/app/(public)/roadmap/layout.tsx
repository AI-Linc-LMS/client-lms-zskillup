import type { ReactNode } from 'react';
import { seoMetadataFor } from '@/lib/seo/page-metadata';

/**
 * The roadmap page is a client component, so its admin-editable SEO metadata is
 * generated here at the (server) layout level and applies to the /roadmap route.
 */
export function generateMetadata() {
  return seoMetadataFor('/roadmap', {
    title: 'Placement Roadmap · ZSkillup',
    description:
      'A step-by-step roadmap to become placement-ready — aptitude, reasoning, verbal, coding and interviews.',
  });
}

export default function RoadmapLayout({ children }: { children: ReactNode }) {
  return children;
}
