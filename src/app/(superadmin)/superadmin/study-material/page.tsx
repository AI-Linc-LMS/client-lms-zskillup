import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { StudyMaterialAdmin } from '@/components/superadmin/StudyMaterialAdmin';

/** Super-admin: per-company Study Material editor (same tool as /admin/study-material). */
export default function SuperadminStudyMaterialPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Super-admin', href: '/superadmin/dashboard' }, { label: 'Study Material' }]} />
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Catalog</p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">Study Material</h1>
        <p className="mt-1 text-sm text-slate-600">
          Author each company&apos;s study material - sections, topics, and video / quiz / article items -
          reflected on the student hub instantly.
        </p>
      </header>
      <StudyMaterialAdmin />
    </div>
  );
}
