import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { CoursesAdmin } from '@/components/superadmin/CoursesAdmin';

/**
 * Super-admin: Course-authoring console (Sprint 2 — Courses / Modules / Lessons).
 * Author a course, build its curriculum of ordered modules and lessons, then
 * publish it into the public catalog (`GET /courses`) and the student dashboard.
 *
 * Endpoint surface (backend):
 *   GET    /api/v1/admin/courses        — list all courses (drafts included)
 *   GET    /api/v1/admin/courses/:slug  — one course with modules + lessons
 *   POST   /api/v1/admin/courses        — create (starts as a DRAFT)
 *   PATCH  /api/v1/admin/courses/:id    — update (incl. publish toggle)
 *   POST   /api/v1/admin/modules        — add a module to a course
 *   PATCH  /api/v1/admin/modules/:id    — update a module
 *   DELETE /api/v1/admin/modules/:id    — delete a module (cascades to lessons)
 *   POST   /api/v1/admin/lessons        — add a lesson to a module
 *   PATCH  /api/v1/admin/lessons/:id    — update a lesson
 *   DELETE /api/v1/admin/lessons/:id    — delete a lesson
 */
export default function AdminCoursesPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Super-admin', href: '/superadmin/dashboard' },
          { label: 'Courses' },
        ]}
      />

      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Catalog</p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">Courses</h1>
        <p className="mt-1 text-sm text-slate-500">
          Author courses and their curriculum of modules and lessons. Published courses appear in
          the student catalog and dashboard instantly.
        </p>
      </header>

      <CoursesAdmin />
    </div>
  );
}
