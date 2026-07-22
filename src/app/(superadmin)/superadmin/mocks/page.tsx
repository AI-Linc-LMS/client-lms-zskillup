import { FileCheck2 } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { MocksAdmin } from '@/components/superadmin/MocksAdmin';

/**
 * Super-admin: Mock-test console (Sprint 4 - "Mock test definitions"). Author
 * timed mock tests from the published question bank; the student-facing engine
 * (`/mock-assessment` → `/dashboard/quiz`) serves and grades them.
 *
 * Endpoint surface (backend):
 *   GET    /api/v1/admin/mocks       - list all mocks
 *   GET    /api/v1/admin/mocks/:id   - one mock with its question set
 *   POST   /api/v1/admin/mocks       - create
 *   PATCH  /api/v1/admin/mocks/:id   - update (questionIds replaces the set)
 *   DELETE /api/v1/admin/mocks/:id   - delete (deactivates if it has attempts)
 */
export default function AdminMocksPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Super-admin', href: '/superadmin/dashboard' },
          { label: 'Mock Tests' },
        ]}
      />

      <ConsoleHero
        icon={FileCheck2}
        eyebrow="Super Admin"
        title="Mock Tests"
        description="Build timed mock assessments from your published question bank. Active mocks appear in the student catalog instantly."
      />

      <MocksAdmin />
    </div>
  );
}
