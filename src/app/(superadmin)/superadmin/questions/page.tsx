import { Suspense } from 'react';
import { ClipboardList } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { QuestionsAdmin } from '@/components/superadmin/QuestionsAdmin';

/**
 * Super-admin: Question-bank console (Implementation Plan §4 / Sprint 3 exit -
 * "superadmin question-bank CRUD"). Lists questions with status, lets the
 * operator author a new one (options + correct-answer marking, hint,
 * explanation), publish/unpublish, and archive.
 *
 * Endpoint surface (backend):
 *   GET    /api/v1/admin/questions      - paginated list (status / topic filters)
 *   POST   /api/v1/admin/questions      - create question + options
 *   PATCH  /api/v1/admin/questions/:id  - partial update (publish toggle)
 *   DELETE /api/v1/admin/questions/:id  - soft delete (status = ARCHIVED)
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

      <ConsoleHero
        icon={ClipboardList}
        eyebrow="Super Admin"
        title="Question bank"
        description="Author practice questions, sort the catalog, and keep the approved set clean for students. Drafts and archived questions stay out of practice flows."
      />

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
