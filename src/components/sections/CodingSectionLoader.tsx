'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { SectionHub } from './SectionHub';
import { listCodingTopics } from '@/lib/api/mocks';
import { buildCodingSection, type SectionRoot } from '@/lib/sections/section-catalog';

/**
 * Client loader for the Coding Sectional Hub. The coding-topic list is auth-gated
 * (can't be fetched in the server page), so we fetch it here, build the synthetic
 * coding section, and hand it to the shared `SectionHub`.
 */
export function CodingSectionLoader() {
  const [section, setSection] = useState<SectionRoot | null>(null);

  useEffect(() => {
    listCodingTopics()
      .then((ct) => setSection(buildCodingSection(ct)))
      .catch(() => setSection(buildCodingSection([])));
  }, []);

  if (!section) {
    return (
      <div className="grid h-64 place-items-center">
        <Loader2 className="size-6 animate-spin text-orange" aria-hidden="true" />
      </div>
    );
  }
  return <SectionHub section={section} />;
}
