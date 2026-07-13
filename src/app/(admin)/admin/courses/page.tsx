import { Suspense } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { CoursesAdmin } from '@/components/superadmin/CoursesAdmin';

/** Admin console — Courses / content (videos, text, concept reels). */
export default function AdminCoursesPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Platform Admin', href: '/admin/dashboard' }, { label: 'Courses' }]} />
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Content</p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">Courses</h1>
        <p className="mt-1 text-sm text-slate-600">Author courses, modules and lessons (video / text / concept reels).</p>
      </header>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />}>
        <CoursesAdmin />
      </Suspense>
    </div>
  );
}
