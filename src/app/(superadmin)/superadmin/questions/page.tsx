import { Suspense } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { QuestionsAdmin } from '@/components/superadmin/QuestionsAdmin';

/**
 * Super-admin: Question-bank console (Implementation Plan §4 / Sprint 3 exit —
 * "superadmin question-bank CRUD"). Lists questions with status, lets the
 * operator author a new one (options + correct-answer marking, hint,
 * explanation), publish/unpublish, and archive.
 *
 * Endpoint surface (backend):
 *   GET    /api/v1/admin/questions      — paginated list (status / topic filters)
 *   POST   /api/v1/admin/questions      — create question + options
 *   PATCH  /api/v1/admin/questions/:id  — partial update (publish toggle)
 *   DELETE /api/v1/admin/questions/:id  — soft delete (status = ARCHIVED)
 */
export default function AdminQuestionsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Super-admin', href: '/superadmin/dashboard' },
          { label: 'Question bank' },
        ]}
      />

      <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-6 sm:px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(249,115,22,0.12),_transparent_30%),linear-gradient(135deg,_rgba(15,23,42,0.03),_rgba(248,250,252,1))]" />
        <div className="relative max-w-3xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Catalog
          </p>
          <h1 className="mt-2 text-[28px] font-extrabold tracking-tight text-navy">
            Question bank
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Author practice questions, sort the catalog, and keep the approved set clean for
            students. Drafts and archived questions stay out of practice flows.
          </p>
        </div>
      </header>

      <Suspense
        fallback={
          <div className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />
        }
      >
        <QuestionsAdmin />
      </Suspense>
    </div>
  );
}
