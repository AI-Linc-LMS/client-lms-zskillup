import { Film } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { ConceptVideosAdmin } from '@/components/admin/ConceptVideosAdmin';

/** Super-admin: attach a per-topic Vimeo concept video, shown in the adaptive
 *  Concept-video modal and the study-plan concept-video step. */
export default function SuperadminConceptVideosPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Super-admin', href: '/superadmin/dashboard' },
          { label: 'Concept Videos' },
        ]}
      />
      <ConsoleHero
        icon={Film}
        eyebrow="Super Admin"
        title="Concept Videos"
        description="Attach a Vimeo concept video to each topic — students see it in the adaptive Concept-video modal and their study-plan step."
      />
      <ConceptVideosAdmin />
    </div>
  );
}
