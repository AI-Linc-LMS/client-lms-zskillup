import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { TopBarShell } from '@/components/layout/TopBarShell';
import { seoMetadataFor } from '@/lib/seo/page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return seoMetadataFor('/prepare', {
    title: 'Prepare — Company-Wise PYQ Practice | ZSkillup',
    description:
      'Practice real previous-year placement questions company by company. Adaptive drills, sectional tests and full mocks modelled on actual recruitment rounds.',
  });
}

export default function PrepareLayout({ children }: { children: ReactNode }) {
  return <TopBarShell>{children}</TopBarShell>;
}
