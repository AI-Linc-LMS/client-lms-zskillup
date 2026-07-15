import { FileText } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { StudyMaterialAdmin } from '@/components/superadmin/StudyMaterialAdmin';

/**
 * Admin: per-company Study Material editor. Author a company's Section → Topic →
 * Item tree (concept videos via Vimeo / Google Drive / YouTube links, topic
 * quizzes, articles). Everything published here shows on the student side instantly.
 */
export default function AdminStudyMaterialPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Admin', href: '/admin/dashboard' }, { label: 'Study Material' }]} />
      <ConsoleHero
        icon={FileText}
        eyebrow="Platform Admin"
        title="Study Material"
        description="Pick a company, then build its study material - sections, topics, and video / quiz / article items. Paste a Vimeo, Google Drive or YouTube link for videos; changes appear on the student hub instantly."
      />
      <StudyMaterialAdmin />
    </div>
  );
}
