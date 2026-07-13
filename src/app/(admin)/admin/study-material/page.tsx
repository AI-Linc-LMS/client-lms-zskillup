import { Breadcrumb } from '@/components/layout/Breadcrumb';
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
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Catalog</p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">Study Material</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pick a company, then build its study material - sections, topics, and video / quiz / article items.
          Paste a Vimeo, Google Drive or YouTube link for videos; changes appear on the student hub instantly.
        </p>
      </header>
      <StudyMaterialAdmin />
    </div>
  );
}
