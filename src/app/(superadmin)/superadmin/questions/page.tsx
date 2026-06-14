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

      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Catalog</p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">Question bank</h1>
        <p className="mt-1 text-sm text-slate-500">
          Author practice questions, mark the correct answer, and publish them to students. Drafts
          and archived questions are never served in practice.
        </p>
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
