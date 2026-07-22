import { Suspense } from 'react';
import { GraduationCap } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { CoursesAdmin } from '@/components/superadmin/CoursesAdmin';

/** Admin console - Courses / content (videos, text, concept reels). */
export default function AdminCoursesPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Platform Admin', href: '/admin/dashboard' }, { label: 'Courses' }]} />
      <ConsoleHero
        icon={GraduationCap}
        eyebrow="Platform Admin"
        title="Courses"
        description="Author courses, modules and lessons (video / text / concept reels)."
      />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />}>
        <CoursesAdmin />
      </Suspense>
    </div>
  );
}
