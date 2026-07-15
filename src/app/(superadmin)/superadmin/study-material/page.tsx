import { FileText } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { StudyMaterialAdmin } from '@/components/superadmin/StudyMaterialAdmin';

/** Super-admin: per-company Study Material editor (same tool as /admin/study-material). */
export default function SuperadminStudyMaterialPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Super-admin', href: '/superadmin/dashboard' }, { label: 'Study Material' }]} />
      <ConsoleHero
        icon={FileText}
        eyebrow="Super Admin"
        title="Study Material"
        description="Author each company's study material - sections, topics, and video / quiz / article items - reflected on the student hub instantly."
      />
      <StudyMaterialAdmin />
    </div>
  );
}
